# je suis parti sur le choix de la technologie NodeJS pour concevoir mon APIRest

####  Mon (JWT) token de connexion : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1MTY5MzIxOCwiZXhwIjoxNzUxNjk2ODE4fQ.JEGvrWfi52DYqUcvpZXwNZVortnrcJEcVefSLigR1jQ.

# j'ai utilisé une architecture RestAPI qui expose toutes les routes de mes différentes tables

# j'ai utilisé une Base de données MySQL en local

# les tests d'opérations CRUD ont été effectués sur Postman.

# j'ai utilisé un système d'authentification pour protéger mes routes


# token pour le service_client : eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJuaW1wb3J0ZSIsImlhdCI6MTc1NDIyMjE0MCwiZXhwIjoxNzU0MjI1NzQwLCJyb2xlcyI6WyJST0xFX1VTRVIiXX0.8XRtJXlQl5QrQhAIQ1bdKdp1zl0sdSS7km7SuPCwwzg

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImlhdCI6MTc1OTY0NjQ2NCwiZXhwIjoxNzU5NjUwMDY0fQ.rJrYPjmiAg_la8axHJpV9boO5qK86TwuqwQNqI6s0rY

const SECRET = process.env.JWT_SECRET; // Clé dans .env



#### mysql2/promise + connection pool
nous avons utilsé mysql2, mais avec Promises et gestion automatique des connexions  car étant ds un environnement Render + OVH, 
- Les callbacks cassent facilement en cloud, pour notre car Sur Render les connexions MySQL étaient coupées
- Le pool gère ça pour toi en ouvrant plusieurs connexions, en réutilisant les connexions valides, en recréant automatiquement si OVH en ferme une