Step 1: Create Django Project
Open your terminal and run these commands:

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install Django and other packages
pip install django djangorestframework django-cors-headers mysqlclient

 # put venv to gitignore (as this folder is very large, avoid to push this to github)
New-Item -Path ".gitignore" -ItemType "file"
Add-Content -Path ".gitignore" -Value "venv/`nenv/`n.env/" 

# Create Django project
django-admin startproject tripmate_backend
cd tripmate_backend

# Create accounts app
python manage.py startapp accounts

# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser (admin)
python manage.py createsuperuser

# Run the server
python manage.py runserver

# Create React app with Vite
npm create vite@latest tripmate-frontend -- --template react
cd tripmate-frontend

# Install dependencies
npm install
npm install lucide-react axios react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# run development server
npm run dev