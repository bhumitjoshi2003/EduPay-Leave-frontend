# 🎓 EduPay-Leave-Frontend

Welcome to the **EduPay-Leave-Frontend** repository! 🚀 This is the frontend application for the **IAS Management System**, designed to facilitate student fee management, payments, and leave tracking with an intuitive user interface.

---

## 🛠️ Technologies Used

- **🌐 Angular** - A powerful framework for building dynamic web applications.
- **📜 TypeScript** - A statically typed superset of JavaScript.
- **🛡️ Keycloak** - Handles user authentication and authorization.
- **💳 Razorpay** - Seamless payment gateway integration.

---

## 📋 Prerequisites

Before getting started, ensure you have the following installed:

✅ **Node.js** (vX.X.X or higher) - [Download](https://nodejs.org/)  
✅ **npm** (or **Yarn**) - Installed with Node.js  
✅ **Angular CLI** - Install globally using:  
   ```bash
   npm install -g @angular/cli  # or yarn global add @angular/cli
   ```
✅ **Keycloak Server** - A running Keycloak instance for authentication  
✅ **Razorpay Account** - An account with API keys for handling payments

---

## 📥 Installation

1️⃣ **Clone the repository:**
   ```bash
   git clone https://github.com/bhumitjoshi2003/EduPay-Leave-frontend.git
   cd EduPay-Leave-frontend
   ```

2️⃣ **Install dependencies:**
   ```bash
   npm install  # or yarn install
   ```

---

## ⚙️ Configuration

### 🔐 Keycloak Configuration
1. Locate the Keycloak config file (e.g., `keycloak.json` or within `environment.ts`).
2. Update it with your Keycloak **server URL, realm, and client ID**.
3. Example `environment.ts` setup:

   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://your-backend-api-url',
     keycloak: {
       issuer: 'YOUR_KEYCLOAK_ISSUER_URL', // Example: http://localhost:8080/auth/realms/your-realm
       realm: 'YOUR_KEYCLOAK_REALM',
       clientId: 'YOUR_KEYCLOAK_CLIENT_ID'
     }
   };
   ```

### 💳 Razorpay Configuration
1. Ensure the **payment component/service** is configured with your Razorpay API key.
2. Store API keys **securely** (avoid hardcoding them in the frontend!).
3. Backend should handle the creation of Razorpay order IDs.

### 🔗 API Configuration
1. Update `environment.ts` with the correct backend API URL.
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://your-backend-api-url'
   };
   ```

---

## 🚀 Running the Project

1️⃣ **Start Keycloak Server:** Ensure your Keycloak instance is running.

2️⃣ **Run the Angular Application:**
   ```bash
   ng serve  # or yarn start
   ```

3️⃣ **Access the Application:** Open your browser and go to:
   🔗 `http://localhost:4200/`
   - You'll be redirected to the **Keycloak login page**.
   - Log in using your Keycloak credentials.

4️⃣ **Razorpay Payment Flow:**
   - When making a payment, the Razorpay widget will open.
   - Use **test/live credentials** to complete the transaction.

---

## 🌍 Running this Project for Other Users

👨‍💻 **Steps to set up:**
1. **Clone the repository** and navigate to the project directory.
2. **Install prerequisites** (Node.js, npm/yarn, Angular CLI, Keycloak server).
3. **Update `environment.ts`** with their Keycloak and backend details.
4. **Configure Razorpay** if applicable.
5. **Install dependencies** using:
   ```bash
   npm install  # or yarn install
   ```
6. **Start the application** with:
   ```bash
   ng serve  # or yarn start
   ```
7. **Access the app** at `http://localhost:4200`.

---

### 🎯 Happy Coding! 🚀

