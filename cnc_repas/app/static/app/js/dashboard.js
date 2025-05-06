document.addEventListener('DOMContentLoaded', function() {
    // Current date as starting point
    let currentDate = new Date();
    let currentDay = currentDate.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Calculate the Monday of the current week
    let monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    // Store user reservations
    let userReservations = {};
    
    // Function to display a week
    function displayWeek(startDate) {
        const daysContainer = document.getElementById('calendarDays');
        daysContainer.innerHTML = '';
        
        // Update the week display
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        
        document.getElementById('weekStart').textContent = formatDate(startDate);
        document.getElementById('weekEnd').textContent = formatDate(endDate);
        
        // Format date for API request (YYYY-MM-DD)
        const apiDateFormat = formatDateForAPI(startDate);
        
        // Fetch user's reservations for this week
        fetchUserReservations(apiDateFormat);
    }
    
    function formatDateForAPI(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    function fetchUserReservations(startDate) {
        fetch(`/api/user-reservations?start_date=${startDate}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    userReservations = data.reservations;
                    createCalendarDays(monday);
                } else {
                    console.error('Error fetching reservations:', data.error);
                    createCalendarDays(monday);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                createCalendarDays(monday);
            });
    }
    
    function createCalendarDays(startDate) {
        const daysContainer = document.getElementById('calendarDays');
        daysContainer.innerHTML = ''; // Clear previous content
        
        // Create the days
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            
            const dayCol = document.createElement('div');
            dayCol.className = 'col-md calendar-day';
            
            const dayHeader = document.createElement('h5');
            dayHeader.textContent = getDayName(i) + ' ' + currentDay.getDate();
            
            // Format the date key
            const dateKey = formatDateForAPI(currentDay);
            
            // Check if this date is in the past
            const isPastDate = currentDay < new Date().setHours(0, 0, 0, 0);
            
            // Create reservation toggle
            const toggleContainer = document.createElement('div');
            toggleContainer.className = 'reservation-toggle';
            
            // Create reservation status
            const statusDiv = document.createElement('div');
            statusDiv.className = 'reservation-status';
            
            if (isPastDate) {
                // Show a disabled toggle for past dates
                toggleContainer.innerHTML = `
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" disabled>
                        <label class="form-check-label">Réserver</label>
                    </div>
                `;
                statusDiv.textContent = "Date passée";
            } else {
                // Check if user has a reservation for this day
                const isReserved = userReservations[dateKey] && userReservations[dateKey].reserved;
                
                toggleContainer.innerHTML = `
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" role="switch" 
                            id="reservation-${dateKey}" ${isReserved ? 'checked' : ''}>
                        <label class="form-check-label" for="reservation-${dateKey}">Réserver</label>
                    </div>
                `;
                
                statusDiv.textContent = isReserved ? "Réservé" : "Non réservé";
                
                // Add event listener to handle toggle
                setTimeout(() => {
                    const toggle = document.getElementById(`reservation-${dateKey}`);
                    if (toggle) {
                        toggle.addEventListener('change', function() {
                            toggleReservation(dateKey, this.checked);
                        });
                    }
                }, 0);
            }
            
            dayCol.appendChild(dayHeader);
            dayCol.appendChild(toggleContainer);
            dayCol.appendChild(statusDiv);
            daysContainer.appendChild(dayCol);
        }
    }
    
    function toggleReservation(date, isReserved) {
        fetch('/api/toggle-reservation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                date: date,
                reserved: isReserved
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the local store
                if (!userReservations[date]) userReservations[date] = {};
                userReservations[date].reserved = isReserved;
                
                // Update status display
                const statusDiv = document.querySelector(`#reservation-${date}`).closest('.calendar-day').querySelector('.reservation-status');
                statusDiv.textContent = isReserved ? "Réservé" : "Non réservé";
            } else {
                console.error('Error toggling reservation:', data.error);
                alert('Erreur lors de la modification de la réservation. Veuillez réessayer.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Erreur lors de la modification de la réservation. Veuillez réessayer.');
        });
    }
    
    // Navigate to previous week
    document.getElementById('prevWeek').addEventListener('click', function() {
        monday.setDate(monday.getDate() - 7);
        displayWeek(monday);
    });
    
    // Navigate to next week
    document.getElementById('nextWeek').addEventListener('click', function() {
        monday.setDate(monday.getDate() + 7);
        displayWeek(monday);
    });
    
    // Helper functions
    function formatDate(date) {
        return date.toLocaleDateString('fr-FR');
    }
    
    function getDayName(dayIndex) {
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        return days[dayIndex];
    }
    
    // Initial display
    displayWeek(monday);
});
