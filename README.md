# FIXR BACKEND

## Technologies Used
    - Node.js v22.16.0
    - Express.js
    - MongoDB + Mongoose
    - npm

## How to run the server
    - npm install
    - npm start

## Run with Docker
        - Build image (project uses lowercase dockerfile):
            - docker build -f dockerfile -t fixr-backend:latest .
        - Run container with environment variables from .env:
            - docker run -d --name fixr-backend -p 5000:5000 --env-file .env fixr-backend:latest
        - View logs:
            - docker logs -f fixr-backend
        - Stop and remove container:
            - docker stop fixr-backend
            - docker rm fixr-backend

## Deploy to Azure Container Apps
        - Tag and push image to Azure Container Registry:
            - docker tag fixr-backend:latest fixrregistry21744.azurecr.io/fixr-backend:v1
            - docker push fixrregistry21744.azurecr.io/fixr-backend:v1
        - Create Container Apps environment:
            - az containerapp env create \
                --name fixr-env \
                --resource-group exinta-tria \
                --location eastus
        - Create the Container App:
            - az containerapp create \
                --name fixr-backend \
                --resource-group exinta-tria \
                --environment fixr-env \
                --image fixrregistry21744.azurecr.io/fixr-backend:v1 \
                --target-port 5000 \
                --ingress external \
                --registry-server fixrregistry21744.azurecr.io \
                --min-replicas 0 \
                --max-replicas 1

## MongoDB Connection (Database)
    - mongoose.connect(process.env.MONGO_URI)

## Project Structure
        controllers/
        middlewares/
        models/
        routes/
        uploads/
        utils/
        .env.example
        .gitignore
        package.json
        server.js

## Cross-origin resource sharing (CORS) configuration
    - origin: process.env.CLIENT_URL,

## Logs
    - Logs are done with console.log

## API Documentation
    - ![](./docs/openapi.yaml)