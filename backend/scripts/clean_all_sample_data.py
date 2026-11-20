import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "..", "bandhej_dev.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
all_tables = [r[0] for r in cursor.fetchall() if not r[0].startswith('sqlite_')]

print("Found tables:", all_tables)

# Preserve default Admin and Manager, delete any test users
cursor.execute("DELETE FROM users WHERE id > 2")
print("Cleaned test users")

tables_to_purge = [t for t in all_tables if t != 'users']

for t in tables_to_purge:
    cursor.execute(f"DELETE FROM {t}")
    print(f"Purged {t}")

# Reset sequences except users
try:
    cursor.execute("DELETE FROM sqlite_sequence WHERE name != 'users'")
    print("Reset sqlite_sequence")
except Exception as e:
    print(f"sqlite_sequence reset note: {e}")

conn.commit()

# Print remaining counts
print("\n--- Remaining table counts ---")
for t in all_tables:
    cursor.execute(f"SELECT COUNT(*) FROM {t}")
    count = cursor.fetchone()[0]
    print(f"{t}: {count}")

print("\n--- Remaining users ---")
cursor.execute("SELECT id, email, role, full_name FROM users")
for u in cursor.fetchall():
    print(u)

conn.close()
