document.addEventListener('DOMContentLoaded', (event) => {
    const modal = document.getElementById('scriptModal');
    const closeButton = document.getElementById('closeModal');

    window.openModal = function() {
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    closeButton.addEventListener('click', closeModal);

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
});
