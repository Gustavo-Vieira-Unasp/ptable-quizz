import { checkElement, applyFamilyFilter, showStats, resetQuiz, initializeRevealedElements } from './quiz_logic.js';
import { closeStatsPopup, populateFamilyFilter } from './ui_manager.js';

function initQuiz() {
    const inputField = document.getElementById('elementInput');
    const checkElementBtn = document.getElementById('checkElementBtn');
    const familyFilterSelect = document.getElementById('familyFilterSelect');
    const showStatsBtn = document.getElementById('showStatsBtn');
    const closeStatsPopupBtn = document.getElementById('closeStatsPopupBtn');
    const resetQuizBtn = document.getElementById('resetQuizBtn');

    populateFamilyFilter(familyFilterSelect);

    initializeRevealedElements();

    applyFamilyFilter();

    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkElement();
        });
    }

    if (checkElementBtn) checkElementBtn.addEventListener('click', checkElement);
    if (familyFilterSelect) familyFilterSelect.addEventListener('change', applyFamilyFilter);
    if (showStatsBtn) showStatsBtn.addEventListener('click', showStats); 
    if (closeStatsPopupBtn) closeStatsPopupBtn.addEventListener('click', closeStatsPopup);
    if (resetQuizBtn) resetQuizBtn.addEventListener('click', resetQuiz);
    if (inputField) inputField.focus();
}

document.addEventListener('DOMContentLoaded', initQuiz);