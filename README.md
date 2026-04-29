# LedgerLens: AI-powered Receipt Insights

**LedgerLens** is a full-stack, intelligent web app that allows users to upload receipts. Once the receipts are uploaded, the app uses AI to analyze and parse the receipts to generate all-time/monthly insights, real-time data visualization and spending trends. The application consists of a backend, frontend and a PostgreSQL database, with all components running in separate Docker containers.

## Prerequisites

Before you begin, ensure you have the following installed:

- Git: To clone the repository.

- Docker (Docker Desktop recommended): For containerization and running the project in a containerized environment.

- Docker Compose: To manage multi-container Docker applications.

- Node.js & npm (if running the frontend and backend locally without Docker):

- Backend: Java 17+ (preferably Java 21) and Maven.

- Frontend: Angular CLI.

- PostgreSQL (for database, can be managed by Docker as well).

- An OpenAI API key

## Steps for running the app:

- Clone the repository

- Replace ```OPENAI_API_KEY``` in ```${OPENAI_API_KEY}``` with your API key in ```docker-compose.yml``` file in the project root, and application.properties file under ```backend/src/main/resources/```. 

### Running the application using Docker:

1. Build Docker Images:

    Start Docker engine by starting Docker Desktop.

    Make Make sure you are in the project directory where your docker-compose.yml is located, and then run:
    ```bash
    docker-compose build
    ```

    This command will build the necessary Docker images for the frontend, backend and database.

2. Run the application with Docker:

    Start the entire application (frontend, backend, and database) with the following command:
    ```bash
    docker-compose up
    ```

    The backend will run on port 8080.

    The frontend will run on port 4200.

    PostgreSQL database will be available on port 5433.

    If you want to run it in detached mode (in the background), you can append -d:
    ```bash
    docker-compose up -d
    ```

3. Stopping the Application:

    To stop the containers when you’re done:
    ```bash
    docker-compose down
    ```

    This will stop and remove the containers, but the data in the PostgreSQL database will persist if you're using a Docker volume.

4. Rebuilding Containers (Optional):

    If you make changes to the Dockerfiles or need to rebuild the containers:
    ```bash
    docker-compose up --build
    ```

5. Accessing the Application:

    Once the containers are up and running:

        The frontend (Angular app) will be available at http://localhost:4200.

        The backend (Spring Boot app) will be accessible at http://localhost:8080.

### Running the Application Locally Without Docker (Optional)

If you prefer not to use Docker and want to run the backend and frontend locally, follow the steps below:

- Database

Make syre you have PostgreSQL installed locally. If so, you need to create the receipt_buddy database.

1. Open a terminal and log in to PostgreSQL:
    ```bash
    psql -U postgres
    ```

    You'll be prompted for the password you set during the installation.

2. Create the receipt_buddy database:
    ```bash
    CREATE DATABASE receipt_buddy;
    ```

3. Exit PostgreSQL:
    ```bash
    \q
    ```

4. Update Backend Configuration

    In your Spring Boot backend, you need to ensure it's configured to connect to your locally installed PostgreSQL instance.

    Open the application.properties in your backend.

    Update the SPRING_DATASOURCE_URL property to connect to your local PostgreSQL database:
    ```properties
    spring.datasource.url=jdbc:postgresql://localhost:5432/receipt_buddy
    spring.datasource.username=postgres
    spring.datasource.password=your_postgres_password
    ```

    Replace your_postgres_password with the password you set during the installation of PostgreSQL.

    The backend should now be able to connect to the local PostgreSQL database running on localhost:5432.

- Backend:

1. Navigate to the backend directory:
    ```bash
    cd backend
    ```

2. Install dependencies:

    Make sure you have Java and Maven installed. Then, run:
    ```bash
    mvn install
    ```

3. Run the backend:
    ```bash
    ./mvnw spring-boot:run 
    ```

    The backend should now be running at http://localhost:8080.

- Frontend:

1. Navigate to the frontend directory.
    ```bash
    cd frontend
    ```

2. Install dependencies.

    Make sure you have Node.js and npm installed. Then, run:
    ```bash
    npm install
    ```

3. Run the frontend:
    ```bash
    ng serve --proxy-config proxy.config.json
    ```

    The frontend should now be running at http://localhost:4200.
