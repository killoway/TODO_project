import sqlite3, os

DB_PATH = os.path.join(os.path.dirname(__file__), 'planner.db')

def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys = ON')
    return db

def row_to_dict(row):
    return dict(row) if row else None

def rows_to_list(rows):
    return [dict(r) for r in rows]

def init_db():
    db = get_db()
    db.executescript('''
        CREATE TABLE IF NOT EXISTS tasks (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            title      TEXT    NOT NULL,
            priority   TEXT    NOT NULL DEFAULT 'medium',
            date       TEXT    NOT NULL,
            time_slot  TEXT    NOT NULL DEFAULT '',
            category   TEXT    NOT NULL DEFAULT 'general',
            done       INTEGER NOT NULL DEFAULT 0,
            done_at    TEXT,
            order_idx  INTEGER NOT NULL DEFAULT 0,
            created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS subtasks (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            title   TEXT    NOT NULL,
            done    INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS notes (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            date    TEXT    NOT NULL UNIQUE,
            content TEXT    NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS pomodoros (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id    INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
            date       TEXT NOT NULL DEFAULT (date('now','localtime')),
            completed  INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );
    ''')
    db.commit()
    db.close()