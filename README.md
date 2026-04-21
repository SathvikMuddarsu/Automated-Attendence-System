# 📌 Automated Attendance System using Face Recognition

## 📖 Overview
This project is a web-based attendance management system designed for rural schools. It replaces traditional manual attendance registers with an automated system using face recognition and manual ID entry, ensuring accuracy, efficiency, and ease of use.

## 🚀 Features
- Student Registration with Face Data  
- Face Recognition-based Attendance  
- Manual ID Entry (Backup method)  
- Automatic Date & Time Recording  
- Duplicate Attendance Prevention  
- Digital Record Management  

## 🛠️ Tech Stack
- Frontend: HTML, CSS, JavaScript  
- Backend: Python (Flask)  
- Database: SQLite / MongoDB  
- Libraries: OpenCV (Face Recognition)  

## ⚙️ How It Works
1. Register student details and capture face data  
2. Store face encodings in the system  
3. During attendance:
   - Camera scans the student’s face  
   - System matches with stored data  
   - Attendance is marked with timestamp  
4. Manual ID entry is available as backup  

## 💻 Installation & Setup

Clone the repository:
```
git clone https://github.com/your-username/Automated-Attendence-System.git
cd Automated-Attendence-System
```

Create virtual environment:
```
python -m venv venv
```

Activate virtual environment:
```
venv\Scripts\activate
```

Install dependencies:
```
pip install -r requirements.txt
```

Run the application:
```
python app.py
```

Open in browser:
```
http://127.0.0.1:5000/
```

## 📂 Project Structure
```
├── app.py
├── requirements.txt
├── users.db
├── face_data/
├── static/
│   ├── css/
│   └── js/
├── templates/
└── README.md
```

## 📊 Results
- Reduced attendance time significantly  
- Improved accuracy compared to manual systems  
- Prevented proxy and duplicate entries  
- Easy access to attendance records  

## 🔮 Future Scope
- Mobile application integration  
- Cloud-based storage  
- SMS/Email notifications to parents  
- Advanced authentication methods  

## 📌 Conclusion
This project provides a simple, cost-effective, and reliable solution for attendance management in rural schools, improving efficiency and transparency.

## 🙌 Acknowledgment
This project was developed as part of an academic initiative to solve real-world problems in rural education systems.

## 📬 Contact
Feel free to reach out for suggestions or collaboration.
