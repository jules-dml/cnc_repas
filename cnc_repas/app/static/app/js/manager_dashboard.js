document.addEventListener('DOMContentLoaded', function() {
    // Current date as starting point
    let currentDate = new Date();
    let currentDay = currentDate.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Calculate the Monday of the current week
    let monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    // Store the last fetched reservations data for comparison
    let lastReservationsData = null;
    
    // Variable to keep track of the polling interval
    let pollingInterval = null;
    
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
        
        // Fetch reservations for this week
        fetchReservations(apiDateFormat);
        
        // Reset the polling interval when changing weeks
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        // Start polling for updates every 10 seconds
        pollingInterval = setInterval(() => {
            fetchReservations(apiDateFormat, true);
        }, 10000); // 10 seconds
    }
    
    function formatDateForAPI(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    function fetchReservations(apiDateFormat, isPolling = false) {
        fetch(`/api/week-reservations?start_date=${apiDateFormat}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // If this is a polling update, check if data has changed
                    if (isPolling) {
                        // Compare with last data to see if we need to redraw
                        if (JSON.stringify(data.reservations) !== JSON.stringify(lastReservationsData)) {
                            console.log('Reservations data changed, updating calendar...');
                            createCalendarDays(monday, data.reservations);
                            lastReservationsData = data.reservations;
                        }
                    } else {
                        // Initial load or week change, always redraw
                        createCalendarDays(monday, data.reservations);
                        lastReservationsData = data.reservations;
                    }
                } else {
                    console.error('Error fetching reservations:', data.error);
                    if (!isPolling) {
                        // Only create empty calendar on initial load, not during polling
                        createCalendarDays(monday, {});
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                if (!isPolling) {
                    // Only create empty calendar on initial load, not during polling
                    createCalendarDays(monday, {});
                }
            });
    }
    
    function createCalendarDays(startDate, reservations) {
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
            
            const userListContainer = document.createElement('div');
            userListContainer.className = 'user-registrations';
            
            // Format the date to match the API response format
            const dateKey = formatDateForAPI(currentDay);

            // Add a + button to add a new reservation for this day
            const addButton = document.createElement('button');
            addButton.className = 'btn btn-primary btn-sm';
            addButton.textContent = '+';
            
            dayCol.style.position = 'relative';
            addButton.style.position = 'absolute';            
            addButton.style.bottom = '10px';
            addButton.style.right = '10px';
            addButton.style.zIndex = '10';
            
            // Add event listener to open modal with the selected date
            addButton.addEventListener('click', function() {
                document.getElementById('reservationDate').value = dateKey;
                const reservationModal = new bootstrap.Modal(document.getElementById('reservationModal'));
                reservationModal.show();
            });
            
            // Check if there are reservations for this day
            if (reservations[dateKey] && reservations[dateKey].length > 0) {
                // Add each user that has a reservation for this day
                reservations[dateKey].forEach(reservation => {
                    const userElem = document.createElement('p');
                    userElem.className = 'user-registration';
                    userElem.textContent = reservation.user_name + ' (' + reservation.status + ')';
                    userListContainer.appendChild(userElem);
                });
            } else {
                // Show a message if no reservations
                const noReservations = document.createElement('p');
                noReservations.className = 'text-muted';
                noReservations.textContent = 'Aucune réservation';
                userListContainer.appendChild(noReservations);
            }
            
            dayCol.appendChild(dayHeader);
            dayCol.appendChild(userListContainer);
            daysContainer.appendChild(dayCol);
            dayCol.appendChild(addButton);
        }
    }
    
    document.getElementById('validateReservation').addEventListener('click', function() {
        const reservationDate = document.getElementById('reservationDate').value;
        const userId = document.getElementById('userDropdown').value;
        
        fetch('api/create_reservation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date: reservationDate, user_id: userId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Reservation created successfully');
                const reservationModal = bootstrap.Modal.getInstance(document.getElementById('reservationModal'));
                reservationModal.hide();
                displayWeek(monday); // Refresh the calendar
            } else {
                console.error('Error creating reservation:', data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
    
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
    
    // Clean up the interval when the page unloads
    window.addEventListener('beforeunload', function() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
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
