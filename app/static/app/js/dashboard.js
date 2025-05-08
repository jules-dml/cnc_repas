document.addEventListener('DOMContentLoaded', function() {
    // Current date as starting point
    let currentDate = new Date();
    let currentDay = currentDate.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Calculate the Monday of the current week
    let monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    // Store user reservations
    let userReservations = {};
    
    // Default deadline (will be updated with server settings)
    let deadlineHour = 11;
    let deadlineMinute = 0;
    
    // Fetch application settings from the server
    fetch('/api/get-settings')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Parse deadline time from server settings (format HH:MM)
                const deadlineTime = data.settings.deadline_time || "11:00";
                const [hours, minutes] = deadlineTime.split(':').map(Number);
                deadlineHour = hours;
                deadlineMinute = minutes;
            } else {
                console.error('Failed to load settings:', data.error);
            }
        })
        .catch(error => {
            console.error('Error loading settings:', error);
        });
    
    // Check if current time is past deadline
    function isPastDeadline() {
        const now = new Date();
        return now.getHours() > deadlineHour || 
               (now.getHours() === deadlineHour && now.getMinutes() >= deadlineMinute);
    }
    
    // Get remaining time before deadline
    function getDeadlineRemainingTime() {
        const now = new Date();
        const deadline = new Date(now);
        deadline.setHours(deadlineHour, deadlineMinute, 0, 0);
        
        if (now >= deadline) {
            return null; // Past deadline
        }
        
        const diff = deadline - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m restantes`;
        } else {
            return `${minutes}m restantes`;
        }
    }
    
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
        
        // Check if it's today and past deadline
        const isPastTodayDeadline = isToday && isPastDeadline();
        
        if (isPastDate || isPastTodayDeadline) {
            // For past dates, only show status without toggle
            statusDiv.innerHTML = `
                <div class="mb-2 ${isPastTodayDeadline ? 'text-warning' : 'text-secondary'}">
                    <i class="fas fa-clock"></i> ${isPastTodayDeadline ? `Délai dépassé (${deadlineHour}h${deadlineMinute > 0 ? deadlineMinute : ''})` : "Date passée"}
                </div>
                <div class="${isReserved ? 'text-success' : 'text-danger'}">
                    <strong>${isReserved ? "Réservé" : "Non réservé"}</strong>
                </div>
            `;
            
            // Do not add the toggle for past dates
        } else {
            toggleContainer.innerHTML = `
                <div class="form-check form-switch">
                    <input class="form-check-input reservation-toggle-large" type="checkbox" role="switch" 
                        id="reservation-${dateKey}" ${isReserved ? 'checked' : ''}>
                    <label class="form-check-label" for="reservation-${dateKey}">Réserver</label>
                </div>
            `;
            
            statusDiv.className = isReserved ? 
                'reservation-status status-reserved' : 
                'reservation-status status-not-reserved';
            statusDiv.innerHTML = `<strong>${isReserved ? "Réservé" : "Non réservé"}</strong>`;
            
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
        
        // Only append toggle for future dates
        if (!(isPastDate || isPastTodayDeadline)) {
            dayCard.appendChild(toggleContainer);
        }
        
        dayCard.appendChild(statusDiv);
        
        // Add deadline info if it's today and before deadline
        if (isToday && !isPastDeadline()) {
            const deadlineInfo = document.createElement('div');
            deadlineInfo.className = 'deadline-info text-warning mt-2';
            deadlineInfo.innerHTML = `<small><i class="fas fa-clock"></i> Délai: ${deadlineHour}h${deadlineMinute > 0 ? deadlineMinute : ''} (${getDeadlineRemainingTime()})</small>`;
            dayCard.appendChild(deadlineInfo);
        }
        
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
            
            // Add deadline info if before deadline
            if (!isPastDeadline()) {
                const deadlineInfo = document.createElement('div');
                deadlineInfo.className = 'text-warning small';
                deadlineInfo.innerHTML = `<i class="fas fa-clock"></i> Délai: ${deadlineHour}h${deadlineMinute > 0 ? deadlineMinute : ''} (${getDeadlineRemainingTime()})`;
                dayInfo.appendChild(deadlineInfo);
            }
        }
        
        const statusSpan = document.createElement('span');
        statusSpan.className = isReserved ? 
            'status-indicator status-reserved-pill' : 
            'status-indicator status-not-reserved-pill';
        statusSpan.textContent = isReserved ? 'Réservé' : 'Non réservé';
        dayInfo.appendChild(statusSpan);
        
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-container';
        
        // Check if it's today and past deadline
        const isPastTodayDeadline = isToday && isPastDeadline();
        
        if (isPastDate || isPastTodayDeadline) {
            // Hide toggle for past dates, just show a message
            toggleContainer.innerHTML = `
                <small class="text-muted">${isPastTodayDeadline ? `Délai dépassé (${deadlineHour}h${deadlineMinute > 0 ? deadlineMinute : ''})` : "Date passée"}</small>
            `;
        } else {
            // Future date or today before deadline
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
    }
    
    function toggleReservation(date, isReserved) {
        // Check if it's today and past deadline
        const dateObj = new Date(date);
        const isToday = isSameDay(dateObj, new Date());
        
        if (isToday && isPastDeadline() && isReserved) {
            alert(`Les réservations pour aujourd'hui sont fermées après ${deadlineHour}h${deadlineMinute > 0 ? deadlineMinute : ''}.`);
            // Reset the toggle without making API call
            const gridToggle = document.getElementById(`reservation-${date}`);
            if (gridToggle) gridToggle.checked = false;
            
            const listToggle = document.getElementById(`list-reservation-${date}`);
            if (listToggle) listToggle.checked = false;
            
            return;
        }
        
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
