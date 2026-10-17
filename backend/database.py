import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
import pymysql

# Load environment variables from .env file
load_dotenv()

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DB = os.getenv("MYSQL_DB", "gnss_db")

# Automatically ensure the database exists in MySQL
def ensure_database_exists():
    try:
        # Connect to MySQL server without selecting a database first
        conn = pymysql.connect(
            host=MYSQL_HOST,
            port=int(MYSQL_PORT),
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            charset="utf8mb4"
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DB}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        conn.commit()
        conn.close()
        print(f"[MySQL] Database `{MYSQL_DB}` verified/created successfully.")
        return True
    except Exception as e:
        print(f"[MySQL] Warning: Could not connect to MySQL server ({e}).")
        return False

from urllib.parse import quote_plus

# Primary connection string for MySQL (URL-encoded to safely handle special characters like @, #, $, etc.)
encoded_password = quote_plus(MYSQL_PASSWORD)
DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{encoded_password}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"

# Attempt to verify/create database before initializing SQLAlchemy engine
mysql_ready = ensure_database_exists()

try:
    if mysql_ready:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
    else:
        # Fallback to local SQLite if MySQL credentials/service is not reachable
        # This guarantees zero-crash when evaluating on different machines
        print("[Database] Using local SQLite fallback for uninterrupted execution.")
        engine = create_engine("sqlite:///./gnss_local.db", connect_args={"check_same_thread": False})
except Exception as e:
    print(f"[Database] Engine init fallback: {e}")
    engine = create_engine("sqlite:///./gnss_local.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
