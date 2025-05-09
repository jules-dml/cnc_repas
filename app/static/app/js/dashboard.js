document.addEventListener('DOMContentLoaded', function() {
    // Current date as starting point
    let currentDate = new Date();
    let currentDay = currentDate.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Calculate the Monday of the current week
    let monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    // Store user reservations and user info
    let userReservations = {};
    let currentUserStatus = ''; // Will be populated from API response
    let canSelectVolunteerStatus = false; // Whether user can choose volunteer status
    
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
                    currentUserStatus = data.user_status || '';
                    
                    // Check if the user can select volunteer status (Moniteur or Bar)
                    // Debug output to understand user status
                    console.log("Raw user status from API:", data.user_status);
                    
                    // Only enable volunteer status for Moniteur or Bar users
                    canSelectVolunteerStatus = ['Moniteur', 'Bar'].includes(currentUserStatus);
                    console.log("User Status:", currentUserStatus);
                    console.log("Can select volunteer status:", canSelectVolunteerStatus);
                    
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
        
        // Get reservation volunteer status if exists
        const isVolunteer = userReservations[dateKey] && userReservations[dateKey].benevole;
        // Define the displayed status text based on volunteer status
        const reservationStatus = isVolunteer ? 'Bénévole' : currentUserStatus;
        // Check if status should be displayed (only for Moniteur or Bar)
        const shouldDisplayStatus = isVolunteer || ['Moniteur', 'Bar'].includes(currentUserStatus);
        
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
                    ${isReserved && shouldDisplayStatus ? `<span class="ms-2 badge bg-secondary">${reservationStatus}</span>` : ''}
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
            
            // Add volunteer checkbox for eligible users
            if (canSelectVolunteerStatus) {
                console.log("Adding volunteer checkbox for date:", dateKey);
                
                // Create volunteer checkbox as a separate element (not using innerHTML)
                const volunteerDiv = document.createElement('div');
                volunteerDiv.className = 'form-check volunteer-option mt-2 mb-2';
                volunteerDiv.id = `volunteer-div-${dateKey}`;
                // Hide volunteer checkbox if not reserved
                if (!isReserved) {
                    volunteerDiv.style.display = 'none';
                }
                
                const volunteerInput = document.createElement('input');
                volunteerInput.type = 'checkbox';
                volunteerInput.className = 'form-check-input volunteer-checkbox';
                volunteerInput.id = `volunteer-${dateKey}`;
                volunteerInput.checked = isVolunteer;
                volunteerInput.style.marginRight = '5px';
                
                const volunteerLabel = document.createElement('label');
                volunteerLabel.className = 'form-check-label';
                volunteerLabel.htmlFor = `volunteer-${dateKey}`;
                volunteerLabel.textContent = 'En tant que bénévole';
                
                volunteerDiv.appendChild(volunteerInput);
                volunteerDiv.appendChild(volunteerLabel);
                toggleContainer.appendChild(volunteerDiv);
                
                // Add event listener for volunteer toggle
                volunteerInput.addEventListener('change', function() {
                    updateReservationStatus(dateKey, this.checked);
                });
            }
            
            statusDiv.className = isReserved ? 
                'reservation-status status-reserved' : 
                'reservation-status status-not-reserved';
            statusDiv.innerHTML = `<strong>${isReserved ? "Réservé" : "Non réservé"}</strong>
                ${isReserved && shouldDisplayStatus ? `<span class="ms-2 badge bg-secondary">${reservationStatus}</span>` : ''}`;
            
            // Add event listener to handle toggle
            setTimeout(() => {
                const toggle = document.getElementById(`reservation-${dateKey}`);
                if (toggle) {
                    toggle.addEventListener('change', function() {
                        const volunteerCheckbox = document.getElementById(`volunteer-${dateKey}`);
                        const volunteerDiv = document.getElementById(`volunteer-div-${dateKey}`);
                        const isVolunteer = volunteerCheckbox && volunteerCheckbox.checked;
                        
                        // Show/hide volunteer checkbox based on reservation toggle
                        if (volunteerDiv) {
                            volunteerDiv.style.display = this.checked ? 'block' : 'none';
                        }
                        
                        toggleReservation(dateKey, this.checked, isVolunteer);
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
        
        // Get reservation volunteer status if exists
        const isVolunteer = userReservations[dateKey] && userReservations[dateKey].benevole;
        // Define the displayed status text based on volunteer status
        const reservationStatus = isVolunteer ? 'Bénévole' : currentUserStatus;
        // Check if status should be displayed (only for Moniteur or Bar)
        const shouldDisplayStatus = isVolunteer || ['Moniteur', 'Bar'].includes(currentUserStatus);
        
        const statusSpan = document.createElement('span');
        statusSpan.className = isReserved ? 
            'status-indicator status-reserved-pill' : 
            'status-indicator status-not-reserved-pill';
        statusSpan.textContent = isReserved ? 'Réservé' : 'Non réservé';
        dayInfo.appendChild(statusSpan);
        
        // Add status badge if reserved
        if (isReserved && shouldDisplayStatus) {
            const statusBadge = document.createElement('span');
            statusBadge.className = 'badge bg-secondary ms-2';
            statusBadge.textContent = reservationStatus;
            dayInfo.appendChild(statusBadge);
        }
        
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
            
            // Add volunteer checkbox for eligible users in mobile view
            if (canSelectVolunteerStatus) {
                console.log("Adding mobile volunteer checkbox for date:", dateKey);
                
                const volunteerDiv = document.createElement('div');
                volunteerDiv.className = 'form-check volunteer-option mt-1';
                volunteerDiv.id = `list-volunteer-div-${dateKey}`;
                // Hide volunteer checkbox if not reserved
                if (!isReserved) {
                    volunteerDiv.style.display = 'none';
                }
                
                const volunteerInput = document.createElement('input');
                volunteerInput.type = 'checkbox';
                volunteerInput.className = 'form-check-input volunteer-checkbox';
                volunteerInput.id = `list-volunteer-${dateKey}`;
                volunteerInput.checked = isVolunteer;
                
                const volunteerLabel = document.createElement('label');
                volunteerLabel.className = 'form-check-label';
                volunteerLabel.htmlFor = `list-volunteer-${dateKey}`;
                volunteerLabel.textContent = 'Bénévole';
                volunteerLabel.style.fontSize = '0.8em';
                
                volunteerDiv.appendChild(volunteerInput);
                volunteerDiv.appendChild(volunteerLabel);
                toggleContainer.appendChild(volunteerDiv);
                
                // Add event listener for volunteer toggle in list view
                volunteerInput.addEventListener('change', function() {
                    // Update in both views
                    updateReservationStatus(dateKey, this.checked);
                    
                    // Also update the grid view if it exists
                    const gridVolToggle = document.getElementById(`volunteer-${dateKey}`);
                    if (gridVolToggle) gridVolToggle.checked = this.checked;
                });
            }
            
            // Ajouter l'écouteur d'événement après que l'élément soit ajouté au DOM
            setTimeout(() => {
                const toggle = document.getElementById(`list-reservation-${dateKey}`);
                if (toggle) {
                    toggle.addEventListener('change', function() {
                        const listVolunteerCheckbox = document.getElementById(`list-volunteer-${dateKey}`);
                        const listVolunteerDiv = document.getElementById(`list-volunteer-div-${dateKey}`);
                        const isVolunteer = listVolunteerCheckbox && listVolunteerCheckbox.checked;
                        
                        // Show/hide volunteer checkbox based on reservation toggle
                        if (listVolunteerDiv) {
                            listVolunteerDiv.style.display = this.checked ? 'block' : 'none';
                        }
                        
                        toggleReservation(dateKey, this.checked, isVolunteer);
                        
                        // Mettre à jour aussi le toggle de la vue grille s'il existe
                        const gridToggle = document.getElementById(`reservation-${dateKey}`);
                        if (gridToggle) gridToggle.checked = this.checked;
                    });
                }
            }, 0);
        }
        
        listItem.appendChild(dayInfo);
        listItem.appendChild(toggleContainer);
        container.appendChild(listItem);
    }
    
    function updateListViewStatus(date, isReserved, status) {
        const statusIndicator = document.querySelector(`#list-reservation-${date}`)?.closest('.calendar-list-item')?.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.textContent = isReserved ? "Réservé" : "Non réservé";
            statusIndicator.className = isReserved ? 
                'status-indicator status-reserved-pill' : 
                'status-indicator status-not-reserved-pill';
        }
        
        // Remove old status badge if exists
        const oldBadge = document.querySelector(`#list-reservation-${date}`)?.closest('.calendar-list-item')?.querySelector('.badge.bg-secondary');
        if (oldBadge) oldBadge.remove();
        
        // Add status badge if reserved and should display status
        const shouldDisplayStatus = status === 'Bénévole' || ['Moniteur', 'Bar'].includes(currentUserStatus);
        if (isReserved && shouldDisplayStatus) {
            const dayInfo = document.querySelector(`#list-reservation-${date}`)?.closest('.calendar-list-item')?.querySelector('.day-info');
            if (dayInfo) {
                const statusBadge = document.createElement('span');
                statusBadge.className = 'badge bg-secondary ms-2';
                statusBadge.textContent = status;
                dayInfo.appendChild(statusBadge);
            }
        }
    }
    
    function toggleReservation(date, isReserved, isVolunteer) {
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
        
        // Ensure isVolunteer is a boolean value, default to false if undefined
        const volunteerStatus = isVolunteer === true;
        
        fetch('/api/toggle-reservation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                date: date,
                reserved: isReserved,
                benevole: volunteerStatus
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the local store
                if (!userReservations[date]) userReservations[date] = {};
                userReservations[date].reserved = isReserved;
                userReservations[date].benevole = isVolunteer;
                
                // Get the display status
                const displayStatus = isVolunteer ? 'Bénévole' : currentUserStatus;
                
                // Update grid view status display
                updateGridViewStatus(date, isReserved, displayStatus);
                
                // Update list view status display
                updateListViewStatus(date, isReserved, displayStatus);
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
    
    function updateGridViewStatus(date, isReserved, status) {
        const statusDiv = document.querySelector(`#reservation-${date}`)?.closest('.calendar-day')?.querySelector('.reservation-status');
        if (statusDiv) {
            statusDiv.className = isReserved ? 
                'reservation-status status-reserved' : 
                'reservation-status status-not-reserved';
                
            // Check if status should be displayed
            const shouldDisplayStatus = status === 'Bénévole' || ['Moniteur', 'Bar'].includes(currentUserStatus);
            statusDiv.innerHTML = `<strong>${isReserved ? "Réservé" : "Non réservé"}</strong>
                ${isReserved && shouldDisplayStatus ? `<span class="ms-2 badge bg-secondary">${status}</span>` : ''}`;
        }
    }
    
    function updateReservationStatus(date, isVolunteer) {
        // Only proceed if there's already a reservation
        if (!userReservations[date] || !userReservations[date].reserved) {
            return;
        }
        
        fetch('/api/update-reservation-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                date: date,
                benevole: isVolunteer
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the local store
                userReservations[date].benevole = isVolunteer;
                
                // Get the display status
                const displayStatus = isVolunteer ? 'Bénévole' : currentUserStatus;
                
                // Update grid view status display
                updateGridViewStatus(date, true, displayStatus);
                
                // Update list view status display
                updateListViewStatus(date, true, displayStatus);
            } else {
                console.error('Error updating status:', data.error);
                alert('Erreur lors de la mise à jour du statut. Veuillez réessayer.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Erreur lors de la mise à jour du statut. Veuillez réessayer.');
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
