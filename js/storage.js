export function loadProgress() {
    const data = localStorage.getItem('ptable_progress');
    return data ? JSON.parse(data) : [];
}

export function saveProgress(found) {
    localStorage.setItem('ptable_progress', JSON.stringify(found));
}