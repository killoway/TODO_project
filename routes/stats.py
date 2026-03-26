from flask import Blueprint, jsonify
from datetime import date, timedelta
from database import get_db, rows_to_list

stats_bp = Blueprint('stats', __name__)

DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']


@stats_bp.route('/api/stats')
def get_stats():
    db    = get_db()
    today = date.today()

    # ── streak ──────────────────────────────────────────
    streak = 0
    check  = today - timedelta(days=1)   # start from yesterday; today may be incomplete
    for _ in range(365):
        ds   = check.isoformat()
        rows = db.execute('SELECT done FROM tasks WHERE date=?', (ds,)).fetchall()
        if not rows or not all(r['done'] for r in rows):
            break
        streak += 1
        check  -= timedelta(days=1)

    # ── 30-day daily completion ──────────────────────────
    daily = []
    for i in range(29, -1, -1):
        d  = today - timedelta(days=i)
        ds = d.isoformat()
        rows = db.execute(
            'SELECT done FROM tasks WHERE date=?', (ds,)
        ).fetchall()
        total = len(rows)
        done  = sum(1 for r in rows if r['done'])
        daily.append({
            'date':  ds,
            'label': DAY_LABELS[d.weekday()],
            'total': total,
            'done':  done,
            'pct':   round(done / total * 100) if total else 0,
        })

    # ── category breakdown ───────────────────────────────
    cats = db.execute(
        'SELECT category, COUNT(*) as total, SUM(done) as done FROM tasks GROUP BY category'
    ).fetchall()
    categories = [{'category': r['category'], 'total': r['total'],
                   'done': r['done'] or 0} for r in cats]

    # ── active days (has tasks) ──────────────────────────
    active_days = [r[0] for r in db.execute(
        'SELECT DISTINCT date FROM tasks'
    ).fetchall()]

    # ── all-time totals ──────────────────────────────────
    totals = db.execute(
        'SELECT COUNT(*) as total, SUM(done) as done FROM tasks'
    ).fetchone()

    # ── pomodoros last 7 days ────────────────────────────
    pom_rows = db.execute(
        'SELECT date, COUNT(*) as cnt FROM pomodoros WHERE date >= ? GROUP BY date',
        ((today - timedelta(days=6)).isoformat(),)
    ).fetchall()
    pomodoros = {r['date']: r['cnt'] for r in pom_rows}

    # ── time-of-day distribution (completed tasks) ───────
    time_dist_rows = db.execute(
        "SELECT time_slot FROM tasks WHERE done=1 AND time_slot != ''"
    ).fetchall()
    time_dist = {}
    for r in time_dist_rows:
        hour = r['time_slot'].split(':')[0]
        time_dist[hour] = time_dist.get(hour, 0) + 1

    db.close()
    return jsonify({
        'streak':      streak,
        'daily':       daily,
        'categories':  categories,
        'active_days': active_days,
        'totals':      {'total': totals['total'] or 0, 'done': totals['done'] or 0},
        'pomodoros':   pomodoros,
        'time_dist':   time_dist,
    })