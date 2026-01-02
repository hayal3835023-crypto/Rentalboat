from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# Stripe Settings
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Root level health check for Kubernetes
@app.get("/health")
async def root_health():
    return {"status": "healthy"}

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    phone: Optional[str] = None
    picture: Optional[str] = None
    is_owner: bool = False
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    picture: Optional[str] = None

class BoatCreate(BaseModel):
    name: str
    description: str
    category: str
    location: str
    city: str
    price_per_day: float
    capacity: int
    length: float
    year: int
    features: List[str] = []
    images: List[str] = []
    latitude: float
    longitude: float
    has_skipper: bool = False
    skipper_price: float = 0

class Boat(BaseModel):
    boat_id: str
    owner_id: str
    name: str
    description: str
    category: str
    location: str
    city: str
    price_per_day: float
    capacity: int
    length: float
    year: int
    features: List[str]
    images: List[str]
    latitude: float
    longitude: float
    has_skipper: bool
    skipper_price: float
    rating: float = 0
    review_count: int = 0
    is_verified: bool = False
    created_at: datetime

class BookingCreate(BaseModel):
    boat_id: str
    start_date: str
    end_date: str
    guests: int
    with_skipper: bool = False
    message: Optional[str] = None

class Booking(BaseModel):
    booking_id: str
    boat_id: str
    user_id: str
    owner_id: str
    start_date: str
    end_date: str
    guests: int
    with_skipper: bool
    total_price: float
    service_fee: float
    status: str
    message: Optional[str]
    created_at: datetime

class MessageCreate(BaseModel):
    receiver_id: str
    booking_id: Optional[str] = None
    content: str

class Message(BaseModel):
    message_id: str
    sender_id: str
    receiver_id: str
    booking_id: Optional[str]
    content: str
    is_read: bool
    created_at: datetime

class ReviewCreate(BaseModel):
    boat_id: str
    booking_id: str
    rating: int
    comment: str

class CheckoutRequest(BaseModel):
    booking_id: str
    origin_url: str

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> Optional[Dict]:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    
    # Check Authorization header (JWT)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
            if user:
                return user
        except jwt.ExpiredSignatureError:
            pass
        except jwt.InvalidTokenError:
            pass
    
    return None

async def require_auth(request: Request) -> Dict:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register")
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_pw = hash_password(data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "phone": data.phone,
        "password": hashed_pw,
        "picture": None,
        "is_owner": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, data.email)
    
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": data.email,
            "name": data.name,
            "phone": data.phone,
            "picture": None,
            "is_owner": False
        }
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["user_id"], user["email"])
    
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "phone": user.get("phone"),
            "picture": user.get("picture"),
            "is_owner": user.get("is_owner", False)
        }
    }

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Fetch user data from Emergent Auth
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = resp.json()
    
    # Check if user exists
    existing = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if existing:
        user_id = existing["user_id"]
        # Update existing user
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": auth_data["name"], "picture": auth_data.get("picture")}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "phone": None,
            "password": None,
            "picture": auth_data.get("picture"),
            "is_owner": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = auth_data.get("session_token", f"session_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        path="/",
        secure=True,
        httponly=True,
        samesite="none",
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    return user

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_data = {k: v for k, v in user.items() if k != "password"}
    return user_data

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.put("/auth/profile")
async def update_profile(data: UserUpdate, request: Request):
    user = await require_auth(request)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password": 0})
    return updated_user

# ============== BOATS ENDPOINTS ==============

@api_router.get("/boats")
async def get_boats(
    category: Optional[str] = None,
    city: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    capacity: Optional[int] = None,
    verified_only: bool = False
):
    query = {}
    if category:
        query["category"] = category
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if min_price is not None:
        query["price_per_day"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price_per_day", {})["$lte"] = max_price
    if capacity:
        query["capacity"] = {"$gte": capacity}
    if verified_only:
        query["is_verified"] = True
    
    boats = await db.boats.find(query, {"_id": 0}).to_list(100)
    return boats

@api_router.get("/boats/categories")
async def get_categories():
    categories = [
        {"id": "yacht", "name": "Yacht", "icon": "ship", "count": 0},
        {"id": "voilier", "name": "Voilier", "icon": "sailboat", "count": 0},
        {"id": "bateau-moteur", "name": "Bateau à moteur", "icon": "boat", "count": 0},
        {"id": "jet-ski", "name": "Jet Ski", "icon": "waves", "count": 0},
        {"id": "catamaran", "name": "Catamaran", "icon": "ship", "count": 0},
        {"id": "peniche", "name": "Péniche", "icon": "ship", "count": 0}
    ]
    
    for cat in categories:
        cat["count"] = await db.boats.count_documents({"category": cat["id"]})
    
    return categories

@api_router.get("/boats/destinations")
async def get_destinations():
    destinations = [
        {"city": "Cannes", "region": "Côte d'Azur", "image": "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800", "boat_count": 0},
        {"city": "Nice", "region": "Côte d'Azur", "image": "https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=800", "boat_count": 0},
        {"city": "Marseille", "region": "Provence", "image": "https://images.unsplash.com/photo-1564490292125-2e3c78a0c5e8?w=800", "boat_count": 0},
        {"city": "Saint-Tropez", "region": "Côte d'Azur", "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800", "boat_count": 0},
        {"city": "La Rochelle", "region": "Charente-Maritime", "image": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800", "boat_count": 0},
        {"city": "Ajaccio", "region": "Corse", "image": "https://images.unsplash.com/photo-1586022045497-31fcf76fa6cc?w=800", "boat_count": 0}
    ]
    
    for dest in destinations:
        dest["boat_count"] = await db.boats.count_documents({"city": {"$regex": dest["city"], "$options": "i"}})
    
    return destinations

@api_router.get("/boats/{boat_id}")
async def get_boat(boat_id: str):
    boat = await db.boats.find_one({"boat_id": boat_id}, {"_id": 0})
    if not boat:
        raise HTTPException(status_code=404, detail="Boat not found")
    
    # Get owner info
    owner = await db.users.find_one({"user_id": boat["owner_id"]}, {"_id": 0, "password": 0})
    boat["owner"] = owner
    
    # Get reviews
    reviews = await db.reviews.find({"boat_id": boat_id}, {"_id": 0}).to_list(50)
    boat["reviews"] = reviews
    
    return boat

@api_router.post("/boats")
async def create_boat(data: BoatCreate, request: Request):
    user = await require_auth(request)
    
    boat_id = f"boat_{uuid.uuid4().hex[:12]}"
    boat_doc = {
        "boat_id": boat_id,
        "owner_id": user["user_id"],
        **data.model_dump(),
        "rating": 0,
        "review_count": 0,
        "is_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.boats.insert_one(boat_doc)
    
    # Mark user as owner
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"is_owner": True}})
    
    return {"boat_id": boat_id, "message": "Boat created successfully"}

@api_router.get("/boats/owner/my-boats")
async def get_my_boats(request: Request):
    user = await require_auth(request)
    boats = await db.boats.find({"owner_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return boats

@api_router.put("/boats/{boat_id}")
async def update_boat(boat_id: str, data: BoatCreate, request: Request):
    user = await require_auth(request)
    
    boat = await db.boats.find_one({"boat_id": boat_id}, {"_id": 0})
    if not boat:
        raise HTTPException(status_code=404, detail="Boat not found")
    
    if boat["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = data.model_dump()
    await db.boats.update_one({"boat_id": boat_id}, {"$set": update_data})
    
    return {"message": "Boat updated successfully"}

@api_router.delete("/boats/{boat_id}")
async def delete_boat(boat_id: str, request: Request):
    user = await require_auth(request)
    
    boat = await db.boats.find_one({"boat_id": boat_id}, {"_id": 0})
    if not boat:
        raise HTTPException(status_code=404, detail="Boat not found")
    
    if boat["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete related data
    await db.boats.delete_one({"boat_id": boat_id})
    await db.favorites.delete_many({"boat_id": boat_id})
    await db.bookings.update_many(
        {"boat_id": boat_id, "status": "pending"},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Boat deleted successfully"}

# ============== BOOKINGS ENDPOINTS ==============

@api_router.post("/bookings")
async def create_booking(data: BookingCreate, request: Request):
    user = await require_auth(request)
    
    boat = await db.boats.find_one({"boat_id": data.boat_id}, {"_id": 0})
    if not boat:
        raise HTTPException(status_code=404, detail="Boat not found")
    
    # Calculate price
    start = datetime.strptime(data.start_date, "%Y-%m-%d")
    end = datetime.strptime(data.end_date, "%Y-%m-%d")
    days = (end - start).days
    if days < 1:
        raise HTTPException(status_code=400, detail="Invalid date range")
    
    base_price = boat["price_per_day"] * days
    skipper_price = boat.get("skipper_price", 0) * days if data.with_skipper else 0
    total_price = base_price + skipper_price
    service_fee = round(total_price * 0.10, 2)  # Commission 10%
    
    booking_id = f"booking_{uuid.uuid4().hex[:12]}"
    booking_doc = {
        "booking_id": booking_id,
        "boat_id": data.boat_id,
        "user_id": user["user_id"],
        "owner_id": boat["owner_id"],
        "start_date": data.start_date,
        "end_date": data.end_date,
        "guests": data.guests,
        "with_skipper": data.with_skipper,
        "total_price": total_price,
        "service_fee": service_fee,
        "status": "pending",
        "message": data.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking_doc)
    
    return {
        "booking_id": booking_id,
        "total_price": total_price,
        "service_fee": service_fee,
        "grand_total": total_price + service_fee
    }

@api_router.get("/bookings")
async def get_bookings(request: Request):
    user = await require_auth(request)
    
    bookings = await db.bookings.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Add boat info to each booking
    for booking in bookings:
        boat = await db.boats.find_one({"boat_id": booking["boat_id"]}, {"_id": 0})
        booking["boat"] = boat
    
    return bookings

@api_router.get("/bookings/owner")
async def get_owner_bookings(request: Request):
    user = await require_auth(request)
    
    bookings = await db.bookings.find({"owner_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for booking in bookings:
        boat = await db.boats.find_one({"boat_id": booking["boat_id"]}, {"_id": 0})
        booking["boat"] = boat
        renter = await db.users.find_one({"user_id": booking["user_id"]}, {"_id": 0, "password": 0})
        booking["renter"] = renter
    
    return bookings

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, request: Request):
    user = await require_auth(request)
    
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["user_id"] != user["user_id"] and booking["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    boat = await db.boats.find_one({"boat_id": booking["boat_id"]}, {"_id": 0})
    booking["boat"] = boat
    
    return booking

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, request: Request):
    user = await require_auth(request)
    
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if status not in ["confirmed", "cancelled", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": {"status": status}})
    
    return {"message": "Status updated successfully"}

# ============== FAVORITES ENDPOINTS ==============

@api_router.post("/favorites/{boat_id}")
async def add_favorite(boat_id: str, request: Request):
    user = await require_auth(request)
    
    existing = await db.favorites.find_one({"user_id": user["user_id"], "boat_id": boat_id})
    if existing:
        return {"message": "Already in favorites"}
    
    await db.favorites.insert_one({
        "user_id": user["user_id"],
        "boat_id": boat_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Added to favorites"}

@api_router.delete("/favorites/{boat_id}")
async def remove_favorite(boat_id: str, request: Request):
    user = await require_auth(request)
    
    await db.favorites.delete_one({"user_id": user["user_id"], "boat_id": boat_id})
    
    return {"message": "Removed from favorites"}

@api_router.get("/favorites")
async def get_favorites(request: Request):
    user = await require_auth(request)
    
    favorites = await db.favorites.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    
    boats = []
    for fav in favorites:
        boat = await db.boats.find_one({"boat_id": fav["boat_id"]}, {"_id": 0})
        if boat:
            boats.append(boat)
    
    return boats

@api_router.get("/favorites/check/{boat_id}")
async def check_favorite(boat_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        return {"is_favorite": False}
    
    existing = await db.favorites.find_one({"user_id": user["user_id"], "boat_id": boat_id})
    return {"is_favorite": existing is not None}

# ============== MESSAGES ENDPOINTS ==============

@api_router.post("/messages")
async def send_message(data: MessageCreate, request: Request):
    user = await require_auth(request)
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    message_doc = {
        "message_id": message_id,
        "sender_id": user["user_id"],
        "receiver_id": data.receiver_id,
        "booking_id": data.booking_id,
        "content": data.content,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.insert_one(message_doc)
    
    return {"message_id": message_id}

@api_router.get("/messages")
async def get_conversations(request: Request):
    user = await require_auth(request)
    
    # Get unique conversation partners
    sent = await db.messages.find({"sender_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    received = await db.messages.find({"receiver_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    
    partners = set()
    for msg in sent:
        partners.add(msg["receiver_id"])
    for msg in received:
        partners.add(msg["sender_id"])
    
    conversations = []
    for partner_id in partners:
        partner = await db.users.find_one({"user_id": partner_id}, {"_id": 0, "password": 0})
        if partner:
            # Get last message
            last_msg = await db.messages.find_one(
                {"$or": [
                    {"sender_id": user["user_id"], "receiver_id": partner_id},
                    {"sender_id": partner_id, "receiver_id": user["user_id"]}
                ]},
                {"_id": 0}
            )
            
            unread_count = await db.messages.count_documents({
                "sender_id": partner_id,
                "receiver_id": user["user_id"],
                "is_read": False
            })
            
            conversations.append({
                "partner": partner,
                "last_message": last_msg,
                "unread_count": unread_count
            })
    
    return conversations

@api_router.get("/messages/{partner_id}")
async def get_messages_with_user(partner_id: str, request: Request):
    user = await require_auth(request)
    
    messages = await db.messages.find({
        "$or": [
            {"sender_id": user["user_id"], "receiver_id": partner_id},
            {"sender_id": partner_id, "receiver_id": user["user_id"]}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(500)
    
    # Mark as read
    await db.messages.update_many(
        {"sender_id": partner_id, "receiver_id": user["user_id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return messages

# ============== REVIEWS ENDPOINTS ==============

@api_router.post("/reviews")
async def create_review(data: ReviewCreate, request: Request):
    user = await require_auth(request)
    
    # Verify booking exists and is completed
    booking = await db.bookings.find_one({
        "booking_id": data.booking_id,
        "user_id": user["user_id"],
        "boat_id": data.boat_id
    }, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "booking_id": data.booking_id,
        "user_id": user["user_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed")
    
    review_id = f"review_{uuid.uuid4().hex[:12]}"
    review_doc = {
        "review_id": review_id,
        "boat_id": data.boat_id,
        "booking_id": data.booking_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "rating": data.rating,
        "comment": data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update boat rating
    reviews = await db.reviews.find({"boat_id": data.boat_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.boats.update_one(
        {"boat_id": data.boat_id},
        {"$set": {"rating": round(avg_rating, 2), "review_count": len(reviews)}}
    )
    
    return {"message": "Review created successfully"}

@api_router.get("/reviews/{boat_id}")
async def get_boat_reviews(boat_id: str):
    reviews = await db.reviews.find({"boat_id": boat_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reviews

# ============== PAYMENT ENDPOINTS ==============

@api_router.post("/payments/checkout")
async def create_checkout(data: CheckoutRequest, request: Request):
    user = await require_auth(request)
    
    booking = await db.bookings.find_one({"booking_id": data.booking_id, "user_id": user["user_id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] != "pending":
        raise HTTPException(status_code=400, detail="Booking is not pending")
    
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    host_url = data.origin_url
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    amount = booking["total_price"] + booking["service_fee"]
    success_url = f"{host_url}/booking/{data.booking_id}/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/booking/{data.booking_id}"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(amount),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": data.booking_id,
            "user_id": user["user_id"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "booking_id": data.booking_id,
        "user_id": user["user_id"],
        "session_id": session.session_id,
        "amount": amount,
        "currency": "eur",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    user = await require_auth(request)
    
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction status
    if status.payment_status != transaction.get("payment_status"):
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": status.payment_status, "status": status.status}}
        )
        
        # Update booking status if paid
        if status.payment_status == "paid":
            await db.bookings.update_one(
                {"booking_id": transaction["booking_id"]},
                {"$set": {"status": "confirmed"}}
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount": status.amount_total / 100,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
        
        if event.payment_status == "paid":
            booking_id = event.metadata.get("booking_id")
            if booking_id:
                await db.bookings.update_one(
                    {"booking_id": booking_id},
                    {"$set": {"status": "confirmed"}}
                )
                await db.payment_transactions.update_one(
                    {"session_id": event.session_id},
                    {"$set": {"payment_status": "paid", "status": "complete"}}
                )
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": False, "error": str(e)}

# ============== DEMO DATA ==============

@api_router.post("/seed-demo-data")
async def seed_demo_data():
    # Check if already seeded
    existing = await db.boats.count_documents({})
    if existing > 0:
        return {"message": "Demo data already exists"}
    
    # Create demo owner
    owner_id = f"user_{uuid.uuid4().hex[:12]}"
    demo_owner = {
        "user_id": owner_id,
        "email": "proprietaire@demo.fr",
        "name": "Jean-Pierre Dupont",
        "phone": "+33612345678",
        "password": hash_password("demo123"),
        "picture": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
        "is_owner": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(demo_owner)
    
    # Demo boats
    demo_boats = [
        {
            "boat_id": f"boat_{uuid.uuid4().hex[:12]}",
            "owner_id": owner_id,
            "name": "Yacht Prestige 500",
            "description": "Magnifique yacht de luxe pour des sorties inoubliables sur la Côte d'Azur. Équipé de tout le confort moderne, ce yacht offre une expérience de navigation exceptionnelle.",
            "category": "yacht",
            "location": "Port de Cannes",
            "city": "Cannes",
            "price_per_day": 2500.0,
            "capacity": 12,
            "length": 15.5,
            "year": 2022,
            "features": ["Climatisation", "Cuisine équipée", "Wi-Fi", "Jacuzzi", "Plateforme de baignade"],
            "images": [
                "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800",
                "https://images.unsplash.com/photo-1605281317010-fe5ece3098e5?w=800",
                "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800"
            ],
            "latitude": 43.5507,
            "longitude": 7.0127,
            "has_skipper": True,
            "skipper_price": 300.0,
            "rating": 4.9,
            "review_count": 67,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "boat_id": f"boat_{uuid.uuid4().hex[:12]}",
            "owner_id": owner_id,
            "name": "Voilier Dufour 412 GL",
            "description": "Voilier élégant et performant, idéal pour les croisières en famille ou entre amis. Navigation confortable et cabines spacieuses.",
            "category": "voilier",
            "location": "Vieux Port de Marseille",
            "city": "Marseille",
            "price_per_day": 450.0,
            "capacity": 8,
            "length": 12.4,
            "year": 2020,
            "features": ["Pilote automatique", "GPS", "Radar", "Annexe", "Équipement de plongée"],
            "images": [
                "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800",
                "https://images.unsplash.com/photo-1595925889916-5be3f87a23d5?w=800"
            ],
            "latitude": 43.2951,
            "longitude": 5.3730,
            "has_skipper": True,
            "skipper_price": 200.0,
            "rating": 4.8,
            "review_count": 89,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "boat_id": f"boat_{uuid.uuid4().hex[:12]}",
            "owner_id": owner_id,
            "name": "Jet Ski Sea-Doo GTI 130",
            "description": "Jet ski puissant et maniable pour des sensations fortes garanties. Parfait pour découvrir les criques de la région.",
            "category": "jet-ski",
            "location": "Plage de la Croisette",
            "city": "Cannes",
            "price_per_day": 280.0,
            "capacity": 2,
            "length": 3.2,
            "year": 2023,
            "features": ["Moteur 130CV", "GPS", "Mode Sport", "Stockage étanche"],
            "images": [
                "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800"
            ],
            "latitude": 43.5466,
            "longitude": 7.0170,
            "has_skipper": False,
            "skipper_price": 0,
            "rating": 4.7,
            "review_count": 156,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "boat_id": f"boat_{uuid.uuid4().hex[:12]}",
            "owner_id": owner_id,
            "name": "Catamaran Lagoon 42",
            "description": "Catamaran spacieux et stable, idéal pour des vacances en mer avec tout le confort d'un appartement.",
            "category": "catamaran",
            "location": "Port de Nice",
            "city": "Nice",
            "price_per_day": 850.0,
            "capacity": 10,
            "length": 12.8,
            "year": 2021,
            "features": ["4 cabines doubles", "2 salles de bain", "Salon extérieur", "Barbecue", "Kayak"],
            "images": [
                "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=800",
                "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800"
            ],
            "latitude": 43.6961,
            "longitude": 7.2692,
            "has_skipper": True,
            "skipper_price": 250.0,
            "rating": 4.9,
            "review_count": 45,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "boat_id": f"boat_{uuid.uuid4().hex[:12]}",
            "owner_id": owner_id,
            "name": "Bateau à moteur Quicksilver 755",
            "description": "Bateau à moteur rapide et confortable pour des excursions à la journée. Parfait pour la pêche ou les balades en mer.",
            "category": "bateau-moteur",
            "location": "Port de Saint-Tropez",
            "city": "Saint-Tropez",
            "price_per_day": 550.0,
            "capacity": 6,
            "length": 7.5,
            "year": 2022,
            "features": ["Moteur 250CV", "Bimini", "Douche", "Échelle de bain", "Sono"],
            "images": [
                "https://images.unsplash.com/photo-1564490292125-2e3c78a0c5e8?w=800"
            ],
            "latitude": 43.2676,
            "longitude": 6.6407,
            "has_skipper": True,
            "skipper_price": 180.0,
            "rating": 4.6,
            "review_count": 78,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "boat_id": f"boat_{uuid.uuid4().hex[:12]}",
            "owner_id": owner_id,
            "name": "Péniche La Belle Époque",
            "description": "Péniche authentique rénovée avec goût, parfaite pour un séjour atypique sur les canaux du Midi.",
            "category": "peniche",
            "location": "Canal du Midi",
            "city": "La Rochelle",
            "price_per_day": 380.0,
            "capacity": 6,
            "length": 18.0,
            "year": 2019,
            "features": ["3 chambres", "Terrasse", "Poêle à bois", "Vélos inclus", "Cuisine équipée"],
            "images": [
                "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"
            ],
            "latitude": 46.1591,
            "longitude": -1.1520,
            "has_skipper": False,
            "skipper_price": 0,
            "rating": 4.8,
            "review_count": 34,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.boats.insert_many(demo_boats)
    
    return {"message": "Demo data created successfully", "boats_count": len(demo_boats)}

# ============== ADMIN ENDPOINTS ==============

@api_router.get("/admin/stats")
async def get_admin_stats():
    total_users = await db.users.count_documents({})
    owners_count = await db.users.count_documents({"is_owner": True})
    total_boats = await db.boats.count_documents({})
    verified_boats = await db.boats.count_documents({"is_verified": True})
    total_bookings = await db.bookings.count_documents({})
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    
    # Calculate total commission
    bookings = await db.bookings.find({}, {"_id": 0, "total_price": 1, "service_fee": 1}).to_list(10000)
    total_commission = sum(b.get("service_fee", 0) for b in bookings)
    total_bookings_value = sum(b.get("total_price", 0) for b in bookings)
    
    return {
        "total_users": total_users,
        "owners_count": owners_count,
        "total_boats": total_boats,
        "verified_boats": verified_boats,
        "total_bookings": total_bookings,
        "confirmed_bookings": confirmed_bookings,
        "total_commission": total_commission,
        "total_bookings_value": total_bookings_value
    }

@api_router.get("/admin/bookings")
async def get_admin_bookings():
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Add user and boat names
    for booking in bookings:
        user = await db.users.find_one({"user_id": booking["user_id"]}, {"_id": 0, "name": 1})
        boat = await db.boats.find_one({"boat_id": booking["boat_id"]}, {"_id": 0, "name": 1})
        booking["user_name"] = user.get("name") if user else "N/A"
        booking["boat_name"] = boat.get("name") if boat else "N/A"
    
    return bookings

@api_router.get("/admin/users")
async def get_admin_users():
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(500)
    return users

@api_router.get("/admin/boats")
async def get_admin_boats():
    boats = await db.boats.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Add owner names
    for boat in boats:
        owner = await db.users.find_one({"user_id": boat["owner_id"]}, {"_id": 0, "name": 1})
        boat["owner_name"] = owner.get("name") if owner else "N/A"
    
    return boats

@api_router.put("/admin/boats/{boat_id}/verify")
async def verify_boat(boat_id: str):
    result = await db.boats.update_one(
        {"boat_id": boat_id},
        {"$set": {"is_verified": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Boat not found")
    return {"message": "Boat verified successfully"}

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "Boat Rental API v1.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
