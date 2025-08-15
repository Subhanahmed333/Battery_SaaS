#!/usr/bin/env python3
"""
Murick Battery SaaS - Secure Credentials Setup
This script helps you set up and manage encrypted credentials safely.
"""

import os
import json
import getpass
import base64
import secrets
from datetime import datetime
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from passlib.context import CryptContext

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

DATA_DIR = "data"
ADMIN_ACCOUNTS_FILE = os.path.join(DATA_DIR, "admin_accounts.dat")
LICENSES_FILE = os.path.join(DATA_DIR, "licenses.dat")
SECURE_CONFIG_FILE = os.path.join(DATA_DIR, "secure_config.dat")
KEY_FILE = os.path.join(DATA_DIR, "encryption.key")
SALT_FILE = os.path.join(DATA_DIR, "salt.key")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def generate_encryption_key(master_password=None):
    """Generate a secure encryption key using a master password or random generation."""
    # Generate a random salt if it doesn't exist
    if not os.path.exists(SALT_FILE):
        salt = secrets.token_bytes(16)
        with open(SALT_FILE, 'wb') as f:
            f.write(salt)
    else:
        with open(SALT_FILE, 'rb') as f:
            salt = f.read()
    
    # If no master password provided, generate a random key
    if not master_password:
        # Generate a random key if it doesn't exist
        if not os.path.exists(KEY_FILE):
            key = Fernet.generate_key()
            with open(KEY_FILE, 'wb') as f:
                f.write(key)
            print("✅ New encryption key generated and saved.")
            print("⚠️  IMPORTANT: Keep this key secure and backup the 'data' directory!")
        else:
            with open(KEY_FILE, 'rb') as f:
                key = f.read()
    else:
        # Derive key from master password
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(master_password.encode()))
        
        # Save the derived key
        with open(KEY_FILE, 'wb') as f:
            f.write(key)
        print("✅ Encryption key derived from master password and saved.")
    
    return key

# Initialize or load encryption key
def get_encryption_key():
    """Get the encryption key, prompting for master password if needed."""
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, 'rb') as f:
            key = f.read()
        return key
    else:
        print("\n🔐 Encryption Key Setup")
        print("=" * 40)
        print("No encryption key found. You need to set up a new key.")
        
        while True:
            choice = input("Generate random key (r) or use master password (p)? ").lower()
            if choice == 'r':
                return generate_encryption_key()
            elif choice == 'p':
                master_password = getpass.getpass("Enter a strong master password: ")
                confirm_password = getpass.getpass("Confirm master password: ")
                
                if master_password != confirm_password:
                    print("❌ Passwords don't match! Try again.")
                    continue
                    
                if len(master_password) < 8:
                    print("❌ Master password too short! Use at least 8 characters.")
                    continue
                    
                return generate_encryption_key(master_password)
            else:
                print("Invalid choice. Please enter 'r' or 'p'.")

# Check if this is a first-time setup or if encrypted files already exist
def is_first_time_setup():
    """Check if this is the first time setup by looking for existing encrypted files."""
    return not (os.path.exists(ADMIN_ACCOUNTS_FILE) or 
                os.path.exists(LICENSES_FILE) or 
                os.path.exists(SECURE_CONFIG_FILE))

# Initialize encryption
FIRST_TIME_SETUP = is_first_time_setup()
ENCRYPTION_KEY = get_encryption_key()
cipher = Fernet(ENCRYPTION_KEY)

def save_to_encrypted_file(data: dict, filename: str):
    """Serializes, encrypts, and saves data to a file."""
    os.makedirs(DATA_DIR, exist_ok=True)
    json_data = json.dumps(data, default=str).encode('utf-8')
    encrypted_data = cipher.encrypt(json_data)
    with open(filename, 'wb') as f:
        f.write(encrypted_data)

def load_from_encrypted_file(filename: str) -> dict:
    """Loads and decrypts data from a file, returning empty if it fails."""
    try:
        with open(filename, 'rb') as f:
            encrypted_data = f.read()
        
        # If this is not a first-time setup and we get an InvalidToken error,
        # inform the user about the key mismatch
        try:
            decrypted_data = cipher.decrypt(encrypted_data)
            return json.loads(decrypted_data)
        except Exception as e:
            if not FIRST_TIME_SETUP and 'InvalidToken' in str(e):
                print("\n❌ ERROR: Cannot decrypt existing data with the current encryption key.")
                print("This usually happens when:")
                print("  1. You've created a new encryption key but have existing encrypted files")
                print("  2. The encryption key file has been corrupted or replaced")
                print("\nPossible solutions:")
                print("  1. Restore your original encryption.key and salt.key files from backup")
                print("  2. If you don't have a backup, you'll need to delete the existing encrypted files")
                print("     and set up the system from scratch.")
                print("\nWould you like to:")
                choice = input("  1. Exit and try to restore your key files\n  2. Delete existing encrypted files and start fresh\nChoice (1/2): ")
                
                if choice == '1':
                    print("Exiting. Please restore your original key files and try again.")
                    exit(1)
                elif choice == '2':
                    confirm = input("⚠️  WARNING: This will delete all existing data. Type 'DELETE' to confirm: ")
                    if confirm == 'DELETE':
                        # Delete all encrypted files
                        for file_path in [ADMIN_ACCOUNTS_FILE, LICENSES_FILE, SECURE_CONFIG_FILE]:
                            if os.path.exists(file_path):
                                os.remove(file_path)
                                print(f"Deleted {file_path}")
                        print("\n✅ All encrypted files have been deleted. Please restart the setup process.")
                        exit(0)
                    else:
                        print("Deletion cancelled. Exiting.")
                        exit(1)
                else:
                    print("Invalid choice. Exiting.")
                    exit(1)
            
            # For other exceptions, return empty dict
            return {}
    except FileNotFoundError:
        return {}

def setup_admin_credentials():
    """Setup admin credentials securely"""
    print("🔐 Setting up Admin Credentials")
    print("=" * 50)
    
    # Load existing admin accounts
    admin_accounts = load_from_encrypted_file(ADMIN_ACCOUNTS_FILE)
    
    print("Current admin accounts:")
    if admin_accounts:
        for admin_key, account in admin_accounts.items():
            print(f"  - Admin Key: {admin_key}")
            print(f"    Username: {account['username']}")
            print(f"    Name: {account['name']}")
            print(f"    Role: {account['role']}")
            print(f"    Created: {account.get('created_date', 'Unknown')}")
            print()
    else:
        print("  No admin accounts found.")
        print()
    
    while True:
        print("\nAdmin Management Options:")
        print("1. Add new admin account")
        print("2. Update existing admin password")
        print("3. Delete admin account")
        print("4. Continue to license setup")
        print("5. Exit")
        
        choice = input("Select option (1-5): ").strip()
        
        if choice == "1":
            add_admin_account(admin_accounts)
        elif choice == "2":
            update_admin_password(admin_accounts)
        elif choice == "3":
            delete_admin_account(admin_accounts)
        elif choice == "4":
            return True
        elif choice == "5":
            print("\n❌ Setup cancelled by user.")
            return False
        else:
            print("Invalid choice. Please try again.")

def add_admin_account(admin_accounts):
    """Add a new admin account"""
    print("\n➕ Adding New Admin Account")
    print("-" * 30)
    
    admin_key = input("Enter admin key (e.g., MURICK_ADMIN_2024): ").strip()
    if admin_key in admin_accounts:
        print("❌ Admin key already exists!")
        return
    
    username = input("Enter username: ").strip()
    name = input("Enter admin full name: ").strip()
    password = getpass.getpass("Enter password: ")
    confirm_password = getpass.getpass("Confirm password: ")
    
    if password != confirm_password:
        print("❌ Passwords don't match!")
        return
    
    role = input("Enter role (default: super_admin): ").strip() or "super_admin"
    
    # Hash the password before storing
    hashed_password = get_password_hash(password)
    
    admin_accounts[admin_key] = {
        "username": username,
        "password": hashed_password,
        "name": name,
        "role": role,
        "created_date": datetime.now().isoformat()
    }
    
    save_to_encrypted_file(admin_accounts, ADMIN_ACCOUNTS_FILE)
    print(f"✅ Admin account '{username}' added successfully!")

def update_admin_password(admin_accounts):
    """Update existing admin password"""
    if not admin_accounts:
        print("❌ No admin accounts found!")
        return
    
    print("\n🔄 Update Admin Password")
    print("-" * 25)
    
    admin_key = input("Enter admin key to update: ").strip()
    if admin_key not in admin_accounts:
        print("❌ Admin key not found!")
        return
    
    current_password = getpass.getpass("Enter current password: ")
    # Use verify_password to check the hashed password
    if not verify_password(current_password, admin_accounts[admin_key]["password"]):
        print("❌ Current password is incorrect!")
        return
    
    new_password = getpass.getpass("Enter new password: ")
    confirm_password = getpass.getpass("Confirm new password: ")
    
    if new_password != confirm_password:
        print("❌ Passwords don't match!")
        return
    
    # Hash the new password before storing
    admin_accounts[admin_key]["password"] = get_password_hash(new_password)
    admin_accounts[admin_key]["last_password_change"] = datetime.now().isoformat()
    
    save_to_encrypted_file(admin_accounts, ADMIN_ACCOUNTS_FILE)
    print("✅ Password updated successfully!")

def delete_admin_account(admin_accounts):
    """Delete an admin account"""
    if not admin_accounts:
        print("❌ No admin accounts found!")
        return
    
    print("\n🗑️  Delete Admin Account")
    print("-" * 25)
    
    admin_key = input("Enter admin key to delete: ").strip()
    if admin_key not in admin_accounts:
        print("❌ Admin key not found!")
        return
    
    account = admin_accounts[admin_key]
    print(f"Account to delete:")
    print(f"  Username: {account['username']}")
    print(f"  Name: {account['name']}")
    print(f"  Role: {account['role']}")
    
    confirm = input("Are you sure you want to delete this account? (yes/no): ").strip().lower()
    if confirm == "yes":
        del admin_accounts[admin_key]
        save_to_encrypted_file(admin_accounts, ADMIN_ACCOUNTS_FILE)
        print("✅ Admin account deleted successfully!")
    else:
        print("❌ Deletion cancelled.")

def setup_initial_licenses():
    """Setup initial license keys"""
    print("\n🎫 Setting up Initial License Keys")
    print("=" * 40)
    
    licenses = load_from_encrypted_file(LICENSES_FILE)
    
    print(f"Current licenses: {len(licenses)}")
    
    while True:
        choice = input("\nDo you want to add initial license keys? (y/n): ").strip().lower()
        if choice == 'n':
            break
        elif choice == 'y':
            add_license_keys(licenses)
            break
        else:
            print("Please enter 'y' or 'n'")
    
    return True  # Return True to indicate successful completion

def add_license_keys(licenses):
    """Add license keys"""
    import secrets
    
    try:
        count = int(input("How many license keys to generate? "))
        plan = input("Plan type (basic/premium/enterprise) [default: basic]: ").strip() or "basic"
        
        print(f"\n🎯 Generating {count} license keys for plan: {plan}")
        print("-" * 50)
        
        generated_keys = []
        for i in range(count):
            license_key = f"MBM-{datetime.now().year}-{plan.upper()}-{secrets.token_hex(3).upper()}"
            licenses[license_key] = {
                "used": False,
                "plan": plan,
                "created_date": datetime.now().isoformat(),
                "generated_by_setup": True
            }
            generated_keys.append(license_key)
            print(f"  {i+1:2d}. {license_key}")
        
        save_to_encrypted_file(licenses, LICENSES_FILE)
        print(f"\n✅ Successfully generated {count} license keys!")
        
        # Save keys to a text file for easy reference
        keys_file = f"generated_licenses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(keys_file, 'w') as f:
            f.write(f"Generated License Keys - {datetime.now().isoformat()}\n")
            f.write("=" * 60 + "\n")
            f.write(f"Plan: {plan}\n")
            f.write(f"Count: {count}\n\n")
            for key in generated_keys:
                f.write(f"{key}\n")
        
        print(f"📄 License keys also saved to: {keys_file}")
        
    except ValueError:
        print("❌ Invalid number entered!")

def setup_secure_config():
    """Setup secure configuration"""
    print("\n⚙️  Setting up Secure Configuration")
    print("=" * 40)
    
    config = load_from_encrypted_file(SECURE_CONFIG_FILE)
    
    if not config:
        config = {
            "license_generation_settings": {
                "max_licenses_per_day": 10,
                "require_approval": False
            },
            "security_settings": {
                "password_min_length": 8,
                "require_password_change": True,
                "session_timeout_hours": 24
            },
            "app_version": "1.0.0",
            "last_updated": datetime.now().isoformat()
        }
        save_to_encrypted_file(config, SECURE_CONFIG_FILE)
        print("✅ Default secure configuration created!")
    else:
        print("✅ Secure configuration already exists!")
    
    print("Current configuration:")
    print(json.dumps(config, indent=2, default=str))
    
    return True  # Return True to indicate successful completion

def create_key_backup(backup_dir=None):
    """Create a backup of the encryption key"""
    if not os.path.exists(KEY_FILE):
        print("❌ No encryption key found to backup!")
        return False
    
    print("\n💾 Creating Encryption Key Backup")
    print("-" * 40)
    
    if not backup_dir:
        backup_dir = input("Enter backup directory path (leave empty for current directory): ").strip()
        if not backup_dir:
            backup_dir = os.getcwd()
    
    if not os.path.exists(backup_dir):
        try:
            os.makedirs(backup_dir)
        except Exception as e:
            print(f"❌ Error creating backup directory: {e}")
            return False
    
    backup_filename = f"murick_encryption_key_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.key"
    backup_path = os.path.join(backup_dir, backup_filename)
    
    try:
        with open(KEY_FILE, 'rb') as src, open(backup_path, 'wb') as dst:
            dst.write(src.read())
        
        print(f"✅ Encryption key backed up to: {backup_path}")
        print("⚠️  IMPORTANT: Store this backup in a secure location!")
        print("⚠️  Anyone with access to this key can decrypt your data!")
        return True
    except Exception as e:
        print(f"❌ Error backing up encryption key: {e}")
        return False

def create_security_guide():
    """Create a security guide document for shop owners"""
    guide_filename = "SECURITY_GUIDE.md"
    
    guide_content = """# Murick Battery SaaS - Security Guide

## Important Security Information for Shop Owners

This document contains critical security information for your Murick Battery SaaS installation.
**PLEASE READ CAREFULLY AND KEEP IN A SECURE LOCATION.**

### Encryption Key Management

Your system uses strong encryption to protect sensitive data. The encryption key is stored in:
`data/encryption.key`

**IMPORTANT:** This key is the only way to decrypt your data. If it is lost, your data cannot be recovered.
If it is stolen, an attacker could potentially decrypt your sensitive information.

### Security Best Practices

1. **Backup Your Encryption Key**
   - Create regular backups of your encryption key using the setup_credentials.py script
   - Store backups in a secure, offline location separate from your data
   - Consider using a password manager or secure vault for key storage

2. **Protect Access to Your System**
   - Change default admin passwords immediately after installation
   - Use strong, unique passwords for all accounts
   - Limit physical access to the server running the application
   - Use firewall rules to restrict access to the server

3. **Regular Maintenance**
   - Keep your operating system and all software up to date
   - Regularly check for unauthorized access or suspicious activity
   - Perform regular backups of your entire system

4. **If You Suspect a Security Breach**
   - Immediately generate a new encryption key using setup_credentials.py
   - Change all admin passwords
   - Check for unauthorized shops or license usage
   - Contact Murick support for assistance

### Technical Details

The system uses Fernet symmetric encryption (AES-128 in CBC mode with PKCS7 padding).
The encryption key is either randomly generated or derived from a master password using PBKDF2.

**DO NOT MODIFY** the encryption key file manually or attempt to change the encryption
algorithm without guidance from Murick support.

### Contact Information

For security assistance, contact Murick technical support:
Email: support@murick.com

---

Last Updated: {date}
""".format(date=datetime.now().strftime("%Y-%m-%d"))
    
    try:
        with open(guide_filename, 'w', encoding='utf-8') as f:
            f.write(guide_content)
        print(f"✅ Security guide created: {guide_filename}")
        return True
    except Exception as e:
        print(f"❌ Error creating security guide: {e}")
        return False

def main():
    """Main function to run the setup process."""
    print("\n🚀 Murick Battery SaaS - Security Setup")
    print("==================================================")
    print("This script will help you set up encrypted credentials.")
    print("All sensitive data will be encrypted and stored securely.")
    
    if FIRST_TIME_SETUP:
        print("\n📝 First-time setup detected. Creating new secure configuration.")
    else:
        print("\n📝 Existing configuration detected. You can update or modify settings.")
    
    # Setup admin credentials
    if not setup_admin_credentials():
        print("\n❌ Admin credentials setup cancelled or failed.")
        return False
    
    # Setup initial licenses
    if not setup_initial_licenses():
        print("\n❌ License setup cancelled or failed.")
        return False
    
    # Setup secure configuration
    if not setup_secure_config():
        print("\n❌ Secure configuration setup cancelled or failed.")
        return False
    
    # Offer to update server encryption
    print("\n🔄 Server Encryption Update")
    print("=" * 50)
    update_server = input("Would you like to update the server to use the external encryption key? (y/n): ").lower()
    if update_server == 'y':
        if update_server_encryption():
            print("✅ Server encryption updated successfully.")
        else:
            print("❌ Failed to update server encryption.")
    
    # Offer to create a key backup
    print("\n💾 Encryption Key Backup")
    print("=" * 50)
    backup = input("Would you like to create a backup of your encryption key? (y/n): ").lower()
    if backup == 'y':
        backup_dir = input("Enter the directory path for the backup (or press Enter for default): ").strip()
        if not backup_dir:
            backup_dir = os.path.join(os.path.expanduser("~"), "battery_saas_backup")
        
        if create_key_backup(backup_dir):
            print(f"✅ Encryption key backed up to {backup_dir}")
        else:
            print("❌ Failed to create backup.")
    
    # Offer to create a security guide
    print("\n📋 Security Documentation")
    print("=" * 50)
    create_guide = input("Would you like to generate a security guide for shop owners? (y/n): ").lower()
    if create_guide == 'y':
        if create_security_guide():
            print("✅ Security guide created successfully.")
        else:
            print("❌ Failed to create security guide.")
    
    print("\n✅ Setup completed successfully!")
    print("\n⚠️  SECURITY NOTES:")
    print("1. Keep your encryption key secure. If lost, all encrypted data will be inaccessible.")
    print("2. Create regular backups of the 'data' directory, especially after making changes.")
    print("3. The encryption key is stored in 'data/encryption.key'. Protect this file!")
    print("4. Consider storing a backup of your encryption key in a secure location.")
    print("5. If you used a master password, make sure to remember it or store it securely.")
    
    return True

def update_server_encryption():
    """Update server.py to use the external encryption key"""
    server_path = os.path.join("backend", "server.py")
    if not os.path.exists(server_path):
        print(f"❌ Server file not found at {server_path}")
        return False
    
    print("\n🔄 Updating Server Encryption")
    print("-" * 30)
    
    try:
        # Read the server file
        with open(server_path, 'r', encoding='utf-8') as f:
            server_code = f.read()
        
        # Replace hardcoded key with code to load from file
        old_key_code = "ENCRYPTION_KEY = b\"L9-QC0isarg5l_v37sfwNdH25-N6WYkFYcyILg7g0zI=\""
        new_key_code = """# Load encryption key from file
def load_encryption_key():
    key_file = os.path.join(DATA_DIR, "encryption.key")
    try:
        with open(key_file, 'rb') as f:
            return f.read()
    except FileNotFoundError:
        print("⚠️  ERROR: Encryption key not found! Run setup_credentials.py first.")
        raise

ENCRYPTION_KEY = load_encryption_key()"""
        
        # Replace the key code
        if old_key_code in server_code:
            updated_server_code = server_code.replace(old_key_code, new_key_code)
            
            # Write the updated code back
            with open(server_path, 'w', encoding='utf-8') as f:
                f.write(updated_server_code)
            
            print("✅ Server updated to use external encryption key.")
            return True
        else:
            print("❌ Could not find encryption key in server code.")
            print("   You may need to manually update the server code.")
            return False
    except Exception as e:
        print(f"❌ Error updating server: {e}")
        return False

if __name__ == "__main__":
    main()