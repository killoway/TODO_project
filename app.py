from flask import Flask, send_from_directory
from database import init_db
from routes.tasks import tasks_bp
from routes.stats import stats_bp

app = Flask(__name__, static_folder='static')
app.register_blueprint(tasks_bp)
app.register_blueprint(stats_bp)


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)