# EduPay-Leave-frontend

This repository contains the frontend application for the IAS Management system. It's built using Angular and provides a user interface for managing student fees, payments, and related information.

## Technologies Used

* **Angular:** A platform for building client-side web applications.
* **TypeScript:** A statically typed superset of JavaScript.
* **Keycloak:** For user authentication and authorization.
* **Razorpay:** For payment gateway integration.

## Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js:** (Version X.X.X or higher) - [https://nodejs.org/](https://nodejs.org/)
* **npm (Node Package Manager) or Yarn:** (Usually installed with Node.js)
* **Angular CLI:** (Install globally using `npm install -g @angular/cli` or `yarn global add @angular/cli`)
* **Keycloak Server:** A running Keycloak server instance.
* **Razorpay Account:** A Razorpay account with API keys.

## Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/bhumitjoshi2003/EduPay-Leave-frontend.git
    cd EduPay-Leave-frontend
    ```

2.  **Install dependencies:**

    ```bash
    npm install  # or yarn install
    ```

## Configuration

1.  **Keycloak Configuration:**
    * Locate the Keycloak configuration file (e.g., `keycloak.json` or within `environment.ts` if using Angular Keycloak libraries).
    * Update the Keycloak configuration with your Keycloak server URL, realm, and client ID.
    * Example using `environment.ts`:

        ```typescript
        // environment.ts
        export const environment = {
          production: false,
          apiUrl: 'http://your-backend-api-url',
          keycloak: {
            issuer: 'YOUR_KEYCLOAK_ISSUER_URL', //Example: http://localhost:8080/auth/realms/your-realm
            realm: 'YOUR_KEYCLOAK_REALM',
            clientId: 'YOUR_KEYCLOAK_CLIENT_ID'
          }
        };
        ```

2.  **Razorpay Configuration:**
    * Ensure your payment component or service is configured with your Razorpay API key.
    * Handle the Razorpay API key securely. Avoid storing it directly in the frontend code if possible.
    * Ideally, the backend should handle the creation of Razorpay order ids. The frontend will pass the order id to the razorpay payment widget.

3.  **API Configuration:**
    * Ensure that the `environment.ts` (or `environment.prod.ts`) file is configured with the correct backend API endpoint URL.

        ```typescript
        // environment.ts
        export const environment = {
          production: false,
          apiUrl: 'http://your-backend-api-url'
        };
        ```

## Running the Project

1.  **Start Keycloak Server:**
    * Ensure your Keycloak server is running.

2.  **Start the Angular Application:**

    ```bash
    ng serve  # or yarn start
    ```

3.  **Access the Application:**
    * Open your browser and navigate to `http://localhost:4200/`.
    * You will be redirected to the Keycloak login page.
    * Log in with your Keycloak credentials.

4.  **Razorpay Payment:**
    * When you initiate a payment, the Razorpay payment gateway will be displayed.
    * Use your Razorpay test or live credentials to complete the payment.

## Running this project for other users.

1.  **Obtain the code:** Clone the git repository.
2.  **Install prerequisites:** Node.js, npm/yarn, Angular CLI, and a running Keycloak server.
3.  **Configure Keycloak:** Update the `environment.ts` file with their Keycloak server details.
4.  **Configure Razorpay:** If using Razorpay, add their Razorpay API keys or ensure the backend is handling order creation.
5.  **Configure API URL:** Update the `environment.ts` file with their backend API URL.
6.  **Install dependencies:** Run `npm install` or `yarn install`.
7.  **Run the application:** Run `ng serve` or `yarn start`.
8.  **Access the application:** Open a browser and navigate to `http://localhost:4200`.

