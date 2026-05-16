SecureHR - Enterprise Grade HR & Biometric Management System

SecureHR is a robust, containerized, and enterprise-hardened Human Resource Management platform engineered with a strict Python-powered architecture. Migrated away from legacy Node.js/SQLite setups, this production-ready application leverages a Flask-SQLAlchemy core, local PostgreSQL engine replication, an Nginx reverse-proxy gateway, a hardened UFW firewall lockdown configuration, and modular Docker microservice containerization.

🏗️ System Architecture & Production Stack
The infrastructure deployment is segmented into highly isolated layers to prevent single-point-of-failure vulnerabilities and protect sensitive employee data:

Application Layer: Python 3.12 / Flask REST API served via Gunicorn WSGI production workers.
Database Layer: Enterprise-grade PostgreSQL relational management system (`securehr_db`).
Gateway Proxy: Nginx reverse proxy configuring public web requests on Port 80 and piping traffic internally to Port 5000 with custom transmission constraints.
Network Perimeter Hardening: UFW (Uncomplicated Firewall) configured to strictly drop all non-essential ingress probes, restricting operational access explicitly to standard web (80/tcp) and management infrastructure (22/tcp).
Orchestration / Modular Isolation: Docker Linux Engine packaging execution sandboxes via unified host adapter bindings (`--network="host"`).

---

📁 Repository Structure
```text
PentagonSecureHR/
├── .gitignore               # Configured to protect virtual environments and sensitive credentials
├── README.md                # Project deployment documentation
└── src/
    ├── backend/
    │   ├── app.py           # Core Flask API pipeline serving data models and front-end endpoints
    │   ├── requirements.txt # Tracked Python execution package dependencies
    │   └── Dockerfile       # Instruction set packaging the containerized execution context
    └── frontend/
        ├── assets/          # Static enterprise asset registries
        │   ├── faces/       # High-resolution JPEG biometric face mapping parameters
        │   └── img/         # Standard layout elements (e.g., pentagon.png logo tracking)
        ├── js/
        │   └── app.js       # Client-side interface state management framework
        ├── admin.html       # Administrative operations panel
        ├── index.html       # Public authentication landing directory
        ├── login.html       # Secure identity access login terminal
        └── scanner.html     # Biometric face scanning verification portal
