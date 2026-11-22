# WedPlan — Backend API

**A Secure and Scalable Backend for Wedding Planning Platform**

WedPlan is a full-stack wedding planning platform that connects customers with professional wedding service providers. This repository contains the backend REST API, responsible for authentication, authorization, service management, booking operations, subscription payments, and transaction processing.

## 🌐 Live API

[https://wedplan-server-psi.vercel.app](https://wedplan-server-psi.vercel.app)

## 📂 Project Repositories

- Client Repository: [WedPlan Client](https://github.com/zenianazninmbstu/wedplan-client)
- Server Repository: [WedPlan Server](https://github.com/zenianazninmbstu/WedPlan-server)

## ✨ Key Features

- Authentication & Authorization: Secure authentication with Better Auth and JWT verification.
- Role-Based Access Control: Separate permissions for Admin, Vendor, and Customer.
- Service Management: Create, update, delete, approve, and manage wedding services.
- Booking Management: Create booking requests and manage booking statuses.
- Subscription System: Free and Premium vendor subscription plans.
- Stripe Integration: Secure Stripe Checkout and webhook-based payment verification.
- Transaction Management: Store and manage verified subscription payment records.
- Image Upload: Upload and host service and profile images using ImgBB.
- Profile Management: Update user profile information securely.
- API Security: Protected routes, ownership validation, and server-side input validation.
- Error Handling:** Appropriate responses for invalid requests and unauthorized access.

## 🛠️ Technology Stack

WedPlan is built with modern technologies to ensure secure authentication, reliable API operations, and seamless payment processing.

### Backend & Runtime
1. Node.js — JavaScript Runtime Environment
2. Express.js — RESTful API Development
3. JavaScript (ES Modules) — Backend Programming Language

### Database & Authentication
4. MongoDB — NoSQL Database Management
5. Better Auth — Authentication and User Management
6. JOSE — Secure JWT Verification and Authorization

### Third-Party Integrations
7. Stripe — Secure Subscription and Payment Processing
8. ImgBB — Image Upload and Hosting


## 📁 Database Architecture

The application uses MongoDB with Better Auth managing authentication-related collections.

Main business collections:

- users: User profiles, roles, account status, and subscription information.
- Services: Wedding service details, pricing, images, availability, and approval status.
- Bookings: Customer booking requests, vendor references, event details, and booking status.
- Transactions: Verified subscription payment and transaction information.

## ⚙️ Installation & Setup

### 1. Clone the Repository


git clone https://github.com/zenianazninmbstu/WedPlan-server.git


### 2. Navigate to the Project Directory


cd WedPlan-server


### 3. Install Dependencies


npm install


### 4. Configure Environment Variables

Create a `.env` file in the root directory and add the required configuration:


PORT=5000

MONGODB_URI=mongodb_connection_string

BETTER_AUTH_SECRET=better_auth_secret
BETTER_AUTH_URL=http://localhost:5000

CLIENT_URL=http://localhost:3000

GOOGLE_CLIENT_ID=google_client_id
GOOGLE_CLIENT_SECRET=google_client_secret

STRIPE_SECRET_KEY=stripe_secret_key
STRIPE_WEBHOOK_SECRET=stripe_webhook_secret

IMGBB_API_KEY=imgbb_api_key


**Security Notice:** Replace the example values with your actual credentials in your local `.env` file. Never commit `.env` files, API keys, passwords, or other sensitive credentials to GitHub.

### 5. Run the Development Server


npm run dev


The backend server will start at:

[http://localhost:5000](http://localhost:5000)

## 🚀 Deployment

The backend API is deployed using Vercel.

**Production API:**  
[https://wedplan-server-psi.vercel.app](https://wedplan-server-psi.vercel.app)

## 🔐 Security & Payment Verification

- Private API routes are protected using JWT verification middleware.
- Role-based middleware restricts access to authorized users.
- Resource ownership is validated before modifying protected resources.
- Sensitive configuration values are stored in environment variables.
- Stripe webhook signatures are verified on the server.
- Premium subscriptions are activated only after verified Stripe payment events.
- Frontend redirects are not trusted as proof of successful payment.

## 📝 Important Notes

- Configure MongoDB, Better Auth, Google OAuth, Stripe, and ImgBB credentials before running the project locally.
- Use Stripe Test Mode credentials during development and testing.
- Configure the Stripe webhook endpoint to receive payment and subscription events.
- Ensure the client and server URLs are correctly configured.
- Never expose secret credentials in frontend code or public repositories.



**WedPlan — Making Wedding Planning Easier, Smarter, and More Beautiful.**