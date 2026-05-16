SecureHR - Production Deployment & Clean-Slate Installation Guide

This document serves as the complete, step-by-step technical manual for deploying the **SecureHR** enterprise platform on a fresh, clean-slate Linux environment. This guide covers core environment provisioning, database isolation, microservice containerization, reverse-proxy gateway routing, and perimeter network hardening.


🏗️ 1. Infrastructure Architecture Overview
The platform utilizes an enterprise-hardened multi-tier architecture to decouple computational workloads from persistent data storage layers while protecting the public edge interface:

Application Tier: Python 3.12 / Flask REST API served via Gunicorn WSGI production workers inside an isolated container.
Database Tier: Enterprise-grade local PostgreSQL relational management system cluster (`securehr_db`).
Gateway Layer: Nginx reverse proxy configuring public web requests on Port 80 and piping traffic internally to Port 5000 with custom transmission constraints.
Network Perimeter Hardening: UFW (Uncomplicated Firewall) configured to strictly drop all non-essential ingress probes, restricting operational access explicitly to standard web (80/tcp) and management infrastructure (22/tcp).

🚀 2. Step-by-Step Installation Procedure

Step 2.1: Base Environment Provisioning
Log into your fresh Linux Virtual Machine terminal. Update the core system packages index registries and download the foundational compilation utilities, engines, and system dependencies:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git ufw nginx postgresql postgresql-contrib docker.io libpq-dev python3-dev gcc curl lsof
