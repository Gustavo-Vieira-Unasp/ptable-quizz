const STATS_KEY = 'ptable_quiz_stats';

export function saveQuizAttempt(stats) {
    const history = getAllStats();
    
    const newEntry = {
        data: new Date().toLocaleString(),
        acertos: stats.acertos,
        total: stats.total,
        porcentagem: ((stats.acertos / stats.total) * 100).toFixed(1) + '%'
    };

    history.push(newEntry);
    localStorage.setItem(STATS_KEY, JSON.stringify(history));
}

export function getAllStats() {
    const data = localStorage.getItem(STATS_KEY);
    return data ? JSON.parse(data) : [];
}

export function clearHistory() {
    localStorage.removeItem(STATS_KEY);
}