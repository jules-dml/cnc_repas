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
        const listContainer = document.getElementById('calendarList');
        daysContainer.innerHTML = '';
        listContainer.innerHTML = '';
        
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
        const listContainer = document.getElementById('calendarList');
        daysContainer.innerHTML = ''; // Clear previous content
        listContainer.innerHTML = ''; // Clear previous content
        
        // Create the days
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            
            const dateObj = new Date(currentDay);
            const isToday = isSameDay(dateObj, new Date());
            
            // Format the date key
            const dateKey = formatDateForAPI(currentDay);
            
            // Check if this date is in the past
            const isPastDate = currentDay < new Date().setHours(0, 0, 0, 0);
            
            // Check if user has a reservation for this day
            const isReserved = userReservations[dateKey] && userReservations[dateKey].reserved;
            
            // Generate desktop grid version
            createGridViewDay(daysContainer, i, currentDay, isToday, dateKey, isPastDate, isReserved);
            
            // Generate mobile list version
            createListViewDay(listContainer, i, currentDay, isToday, dateKey, isPastDate, isReserved);
        }
    }
    
    function createGridViewDay(container, dayIndex, currentDay, isToday, dateKey, isPastDate, isReserved) {
        const dayCol = document.createElement('div');
        dayCol.className = 'col mb-3';
        
        const dayCard = document.createElement('div');
        dayCard.className = 'calendar-day';
        
        if (isToday) {
            dayCard.style.borderColor = '#0d6efd';
            dayCard.style.borderWidth = '2px';
        }
        
        const dayHeader = document.createElement('h5');
        dayHeader.textContent = getDayName(dayIndex) + ' ' + currentDay.getDate();
        if (isToday) {
            const todayBadge = document.createElement('span');
            todayBadge.className = 'badge bg-primary ms-2';
            todayBadge.textContent = 'Aujourd\'hui';
            dayHeader.appendChild(todayBadge);
        }
        
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
            statusDiv.className = 'reservation-status status-not-reserved';
        } else {
            toggleContainer.innerHTML = `
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" 
                        id="reservation-${dateKey}" ${isReserved ? 'checked' : ''}>
                    <label class="form-check-label" for="reservation-${dateKey}">Réserver</label>
                </div>
            `;
            
            statusDiv.textContent = isReserved ? "Réservé" : "Non réservé";
            statusDiv.className = isReserved ? 
                'reservation-status status-reserved' : 
                'reservation-status status-not-reserved';
            
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
        
        dayCard.appendChild(dayHeader);
        dayCard.appendChild(toggleContainer);
        dayCard.appendChild(statusDiv);
        dayCol.appendChild(dayCard);
        container.appendChild(dayCol);
    }
    
    function createListViewDay(container, dayIndex, currentDay, isToday, dateKey, isPastDate, isReserved) {
        // Créer un élément de liste Bootstrap
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center calendar-list-item';
        if (isToday) listItem.classList.add('today');
        
        const dayInfo = document.createElement('div');
        dayInfo.className = 'day-info';
        
        const dayName = document.createElement('h5');
        dayName.textContent = getDayName(dayIndex) + ' ' + currentDay.getDate();
        dayInfo.appendChild(dayName);
        
        if (isToday) {
            const todayBadge = document.createElement('span');
            todayBadge.className = 'badge bg-primary';
            todayBadge.textContent = 'Aujourd\'hui';
            dayInfo.appendChild(todayBadge);
        }
        
        const statusSpan = document.createElement('span');
        statusSpan.className = isReserved ? 
            'status-indicator status-reserved-pill' : 
            'status-indicator status-not-reserved-pill';
        statusSpan.textContent = isReserved ? 'Réservé' : 'Non réservé';
        dayInfo.appendChild(statusSpan);
        
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-container';
        
        if (isPastDate) {
            // Past date
            toggleContainer.innerHTML = `
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" disabled>
                </div>
                <small class="text-muted">Date passée</small>
            `;
        } else {
            // Future date
            toggleContainer.innerHTML = `
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" 
                        id="list-reservation-${dateKey}" ${isReserved ? 'checked' : ''}>
                </div>
            `;
            
            // Ajouter l'écouteur d'événement après que l'élément soit ajouté au DOM
            setTimeout(() => {
                const toggle = document.getElementById(`list-reservation-${dateKey}`);
                if (toggle) {
                    toggle.addEventListener('change', function() {
                        toggleReservation(dateKey, this.checked);
                        
                        // Mettre à jour aussi le toggle de la vue grille s'il existe
                        const gridToggle = document.getElementById(`reservation-${dateKey}`);
                        if (gridToggle) gridToggle.checked = this.checked;
                        
                        // Mettre à jour le statut dans la vue liste
                        const statusIndicator = this.closest('.calendar-list-item').querySelector('.status-indicator');
                        statusIndicator.textContent = this.checked ? 'Réservé' : 'Non réservé';
                        statusIndicator.className = this.checked ? 
                            'status-indicator status-reserved-pill' : 
                            'status-indicator status-not-reserved-pill';
                    });
                }
            }, 0);
        }
        
        listItem.appendChild(dayInfo);
        listItem.appendChild(toggleContainer);
        container.appendChild(listItem);
        
        // Débogage - vérifier si l'élément est créé
        console.log('Liste mobile: élément créé pour ' + dateKey);
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
                
                // Update grid view status display
                const statusDiv = document.querySelector(`#reservation-${date}`)?.closest('.calendar-day')?.querySelector('.reservation-status');
                if (statusDiv) {
                    statusDiv.textContent = isReserved ? "Réservé" : "Non réservé";
                    statusDiv.className = isReserved ? 
                        'reservation-status status-reserved' : 
                        'reservation-status status-not-reserved';
                }
                
                // Update list view status display
                const listStatusIndicator = document.querySelector(`#list-reservation-${date}`)?.closest('.calendar-list-item')?.querySelector('.status-indicator');
                if (listStatusIndicator) {
                    listStatusIndicator.textContent = isReserved ? "Réservé" : "Non réservé";
                    listStatusIndicator.className = isReserved ? 
                        'status-indicator status-reserved-pill' : 
                        'status-indicator status-not-reserved-pill';
                }
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
    
    function isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }
    
    // Initial display
    displayWeek(monday);
});
