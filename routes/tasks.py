from flask import Blueprint, request, jsonify
from datetime import datetime
from database import get_db, rows_to_list, row_to_dict

tasks_bp = Blueprint('tasks', __name__)

def task_with_subs(db, task_dict):
    subs = rows_to_list(db.execute(
        'SELECT * FROM subtasks WHERE task_id=? ORDER BY id', (task_dict['id'],)
    ).fetchall())
    for s in subs:
        s['done'] = bool(s['done'])
    task_dict['subtasks'] = subs
    task_dict['done']     = bool(task_dict['done'])
    return task_dict


# ── Tasks ────────────────────────────────────────────────────────────────────

@tasks_bp.route('/api/tasks', methods=['GET'])
def get_tasks():
    date = request.args.get('date')
    db   = get_db()
    if date:
        rows = rows_to_list(db.execute(
            'SELECT * FROM tasks WHERE date=? ORDER BY order_idx, id', (date,)
        ).fetchall())
    else:
        rows = rows_to_list(db.execute(
            'SELECT * FROM tasks ORDER BY date, order_idx, id'
        ).fetchall())
    result = [task_with_subs(db, r) for r in rows]
    db.close()
    return jsonify(result)


@tasks_bp.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.get_json()
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Название обязательно'}), 400

    date = data.get('date') or datetime.now().strftime('%Y-%m-%d')
    db   = get_db()
    cur  = db.execute(
        '''INSERT INTO tasks (title, priority, date, time_slot, category, order_idx)
           VALUES (?,?,?,?,?,
             (SELECT COALESCE(MAX(order_idx)+1,0) FROM tasks WHERE date=?))''',
        (title,
         data.get('priority', 'medium'),
         date,
         data.get('time_slot', ''),
         data.get('category', 'general'),
         date)
    )
    db.commit()
    task = task_with_subs(db, row_to_dict(
        db.execute('SELECT * FROM tasks WHERE id=?', (cur.lastrowid,)).fetchone()
    ))
    db.close()
    return jsonify(task), 201


@tasks_bp.route('/api/tasks/<int:tid>/toggle', methods=['PATCH'])
def toggle_task(tid):
    db   = get_db()
    row  = db.execute('SELECT * FROM tasks WHERE id=?', (tid,)).fetchone()
    if not row:
        db.close(); return jsonify({'error': 'Не найдено'}), 404
    done = not bool(row['done'])
    db.execute('UPDATE tasks SET done=?, done_at=? WHERE id=?',
               (done, datetime.now().isoformat() if done else None, tid))
    db.commit()
    task = task_with_subs(db, row_to_dict(
        db.execute('SELECT * FROM tasks WHERE id=?', (tid,)).fetchone()
    ))
    db.close()
    return jsonify(task)


@tasks_bp.route('/api/tasks/<int:tid>', methods=['PATCH'])
def update_task(tid):
    data = request.get_json()
    db   = get_db()
    fields = []
    vals   = []
    for col in ('title', 'priority', 'category', 'time_slot', 'date'):
        if col in data:
            fields.append(f'{col}=?')
            vals.append(data[col])
    if not fields:
        db.close(); return jsonify({'error': 'Нет полей'}), 400
    vals.append(tid)
    db.execute(f'UPDATE tasks SET {", ".join(fields)} WHERE id=?', vals)
    db.commit()
    task = task_with_subs(db, row_to_dict(
        db.execute('SELECT * FROM tasks WHERE id=?', (tid,)).fetchone()
    ))
    db.close()
    return jsonify(task)


@tasks_bp.route('/api/tasks/<int:tid>', methods=['DELETE'])
def delete_task(tid):
    db = get_db()
    db.execute('DELETE FROM tasks WHERE id=?', (tid,))
    db.commit()
    db.close()
    return jsonify({'ok': True})


@tasks_bp.route('/api/tasks/reorder', methods=['POST'])
def reorder_tasks():
    data = request.get_json()   # [{id, order}, …]
    db   = get_db()
    for item in data:
        db.execute('UPDATE tasks SET order_idx=? WHERE id=?',
                   (item['order'], item['id']))
    db.commit()
    db.close()
    return jsonify({'ok': True})


# ── Subtasks ─────────────────────────────────────────────────────────────────

@tasks_bp.route('/api/tasks/<int:tid>/subtasks', methods=['POST'])
def add_subtask(tid):
    title = (request.get_json().get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Пустое название'}), 400
    db  = get_db()
    cur = db.execute('INSERT INTO subtasks (task_id, title) VALUES (?,?)', (tid, title))
    db.commit()
    sub = row_to_dict(db.execute('SELECT * FROM subtasks WHERE id=?', (cur.lastrowid,)).fetchone())
    sub['done'] = bool(sub['done'])
    db.close()
    return jsonify(sub), 201


@tasks_bp.route('/api/tasks/<int:tid>/subtasks/<int:sid>/toggle', methods=['PATCH'])
def toggle_subtask(tid, sid):
    db  = get_db()
    row = db.execute('SELECT * FROM subtasks WHERE id=? AND task_id=?', (sid, tid)).fetchone()
    if not row:
        db.close(); return jsonify({'error': 'Не найдено'}), 404
    done = not bool(row['done'])
    db.execute('UPDATE subtasks SET done=? WHERE id=?', (done, sid))
    db.commit()
    db.close()
    return jsonify({'id': sid, 'done': done})


# ── Notes ─────────────────────────────────────────────────────────────────────

@tasks_bp.route('/api/notes/<date>', methods=['GET'])
def get_note(date):
    db  = get_db()
    row = db.execute('SELECT * FROM notes WHERE date=?', (date,)).fetchone()
    db.close()
    return jsonify({'date': date, 'content': row['content'] if row else ''})


@tasks_bp.route('/api/notes/<date>', methods=['PUT'])
def save_note(date):
    content = (request.get_json().get('content') or '')
    db = get_db()
    db.execute('INSERT INTO notes(date,content) VALUES(?,?) '
               'ON CONFLICT(date) DO UPDATE SET content=excluded.content',
               (date, content))
    db.commit()
    db.close()
    return jsonify({'ok': True})


# ── Pomodoros ─────────────────────────────────────────────────────────────────

@tasks_bp.route('/api/pomodoros', methods=['POST'])
def log_pomodoro():
    data = request.get_json()
    db   = get_db()
    db.execute('INSERT INTO pomodoros (task_id, date) VALUES (?,?)',
               (data.get('task_id'), data.get('date')))
    db.commit()
    db.close()
    return jsonify({'ok': True})