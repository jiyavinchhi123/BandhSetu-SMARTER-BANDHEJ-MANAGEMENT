#!/usr/bin/env python3
"""
BandhSetu — Automated Database Backup CLI Utility
Creates an atomic online backup, encrypts with AES-256-GCM,
verifies integrity in a sandbox, and enforces backup retention.
"""
import sys
import argparse
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.services.backup_service import BackupService


def main():
    parser = argparse.ArgumentParser(description="BandhSetu Encrypted Database Backup Utility")
    parser.add_argument("--type", choices=["FULL", "INCREMENTAL_WAL", "DAILY_AUTOMATED"], default="FULL")
    parser.add_argument("--list", action="store_true", help="List all existing backups")
    parser.add_argument("--verify", type=str, metavar="BACKUP_ID", help="Verify a specific backup in an isolated sandbox")
    parser.add_argument("--restore-to", type=str, metavar="OUTPUT_PATH", help="Decrypt and restore backup to target path")
    parser.add_argument("--backup-id", type=str, help="Backup ID to restore (used with --restore-to)")

    args = parser.parse_args()

    print("=" * 65)
    print(" BANDHSETU — ENTERPRISE DATABASE BACKUP & RECOVERY")
    print("=" * 65)

    if args.list:
        backups = BackupService.list_backups()
        print(f"Total Backups: {len(backups)}\n")
        for b in backups:
            print(f"ID       : {b['backup_id']}")
            print(f"Time IST : {b['timestamp_ist']}")
            print(f"Type     : {b['backup_type']} | Size: {b['original_size_bytes'] / 1024:.1f} KB (Encrypted: {b['encrypted_size_bytes'] / 1024:.1f} KB)")
            print(f"SHA256   : {b['sha256_plaintext'][:16]}...")
            print(f"Counts   : {b.get('table_counts')}")
            print("-" * 65)
        return 0

    if args.verify:
        print(f"[*] Running sandboxed restoration verification for: {args.verify}...")
        res = BackupService.verify_backup_in_sandbox(args.verify)
        print(f"    - Integrity Check : {res['integrity_check']}")
        print(f"    - Table Counts OK : {res['table_counts_verified']}")
        print(f"    - Overall Status  : {'[PASSED] Recovery Viable' if res['verified'] else '[FAILED] Integrity Error'}")
        return 0 if res["verified"] else 1

    if args.restore_to:
        if not args.backup_id:
            # Pick latest
            backups = BackupService.list_backups()
            if not backups:
                print("[ERROR] No backups found to restore.")
                return 1
            args.backup_id = backups[0]["backup_id"]

        dest = Path(args.restore_to)
        print(f"[*] Restoring backup {args.backup_id} to: {dest}...")
        manifest = BackupService.decrypt_backup(args.backup_id, dest)
        print(f"[OK] Database successfully restored and verified from manifest.")
        print(f"     Source Timestamp : {manifest['timestamp_ist']}")
        print(f"     SHA256 Plaintext : {manifest['sha256_plaintext']}")
        return 0

    # Default: Create a new backup
    print(f"[*] Initiating {args.type} online backup with AES-256-GCM encryption...")
    manifest = BackupService.create_encrypted_backup(backup_type=args.type)
    print(f"[OK] Backup ID       : {manifest['backup_id']}")
    print(f"[OK] Timestamp IST   : {manifest['timestamp_ist']}")
    print(f"[OK] Original Size   : {manifest['original_size_bytes'] / 1024:.1f} KB")
    print(f"[OK] Encrypted Size  : {manifest['encrypted_size_bytes'] / 1024:.1f} KB")
    print(f"[OK] Plaintext Hash  : {manifest['sha256_plaintext']}")
    print(f"[OK] Ciphertext Hash : {manifest['sha256_ciphertext']}")
    print(f"[OK] Table Records   : {manifest['table_counts']}")

    # Immediate verification
    print("\n[*] Verifying backup restoration in sandbox...")
    v = BackupService.verify_backup_in_sandbox(manifest["backup_id"])
    print(f"[OK] Sandbox Test    : {'PASSED (Zero Data Loss)' if v['verified'] else 'FAILED'}")

    print("=" * 65)
    return 0


if __name__ == "__main__":
    sys.exit(main())
