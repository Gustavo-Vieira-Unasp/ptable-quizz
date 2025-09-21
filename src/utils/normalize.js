function normalizeString(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

module.exports = {
    normalizeString
};