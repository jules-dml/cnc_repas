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
            dayCol.style.cursor = 'pointer'; // Change cursor to indicate clickable
            
            const dayHeader = document.createElement('h5');
            dayHeader.textContent = getDayName(i) + ' ' + currentDay.getDate();
            
            const userListContainer = document.createElement('div');
            userListContainer.className = 'user-registrations';
            
            // Format the date to match the API response format
            const dateKey = formatDateForAPI(currentDay);
            
            // Make the day clickable to show details
            dayCol.addEventListener('click', function(event) {
                // Don't trigger if clicking the add button
                if (event.target !== addButton && !addButton.contains(event.target)) {
                    showDayDetails(dateKey, getDayName(i) + ' ' + currentDay.getDate(), reservations[dateKey] || []);
                }
            });

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
            addButton.addEventListener('click', function(event) {
                event.stopPropagation(); // Prevent triggering the day click event
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

    // Function to show day details in modal
    function showDayDetails(dateKey, dayName, reservations) {
        const dayDetailsModal = new bootstrap.Modal(document.getElementById('dayDetailsModal'));
        
        // Set the day title
        document.getElementById('detailDayTitle').textContent = dayName + ' - ' + formatDisplayDate(dateKey);
        
        // Calculate statistics by status
        const stats = calculateStatusStats(reservations);
        
        // Display statistics
        const statsContainer = document.getElementById('statusStats');
        statsContainer.innerHTML = '';
        
        Object.keys(stats).forEach(status => {
            const statElement = document.createElement('div');
            statElement.className = 'stat-item text-center mb-3';
            
            const count = document.createElement('h3');
            count.textContent = stats[status];
            
            const label = document.createElement('p');
            label.textContent = status;
            
            statElement.appendChild(count);
            statElement.appendChild(label);
            statsContainer.appendChild(statElement);
        });
        
        // Populate the status filter dropdown with unique statuses
        const statusFilter = document.getElementById('statusFilter');
        statusFilter.innerHTML = '<option value="all">Tous les statuts</option>';
        
        const uniqueStatuses = [];
        if (reservations && reservations.length > 0) {
            reservations.forEach(reservation => {
                if (!uniqueStatuses.includes(reservation.status)) {
                    uniqueStatuses.push(reservation.status);
                    const option = document.createElement('option');
                    option.value = reservation.status;
                    option.textContent = reservation.status;
                    statusFilter.appendChild(option);
                }
            });
        }
        
        // Store the original reservations for filtering
        const originalReservations = [...(reservations || [])];
        
        // Function to render people list based on current filters
        function renderPeopleList(filteredReservations) {
            const peopleListContainer = document.getElementById('peopleList');
            peopleListContainer.innerHTML = '';
            
            if (filteredReservations && filteredReservations.length > 0) {
                const table = document.createElement('table');
                table.className = 'table table-striped';
                
                // Create table header
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                
                ['Nom', 'Status', 'Actions'].forEach(header => {
                    const th = document.createElement('th');
                    th.textContent = header;
                    headerRow.appendChild(th);
                });
                
                thead.appendChild(headerRow);
                table.appendChild(thead);
                
                // Create table body
                const tbody = document.createElement('tbody');
                
                filteredReservations.forEach(reservation => {
                    const row = document.createElement('tr');
                    
                    const nameCell = document.createElement('td');
                    nameCell.textContent = reservation.user_name;
                    
                    const statusCell = document.createElement('td');
                    statusCell.textContent = reservation.status;
                    
                    const actionCell = document.createElement('td');
                    
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'btn btn-sm btn-outline-danger';
                    deleteButton.textContent = 'Supprimer';
                    deleteButton.addEventListener('click', function() {
                        fetch(`/api/delete_reservation/${reservation.id}`, {
                            method: 'DELETE'
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('Reservation deleted successfully');
                                
                                // Close the modal
                                const modal = bootstrap.Modal.getInstance(document.getElementById('dayDetailsModal'));
                                if (modal) {
                                    modal.hide();
                                }
                                
                                // Refresh the calendar data without reloading the page
                                const currentlyDisplayedWeekStart = monday; // Get the current week that's displayed
                                displayWeek(currentlyDisplayedWeekStart);
                            } else {
                                console.error('Error deleting reservation:', data.error);
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);
                        });
                    });
                    
                    actionCell.appendChild(deleteButton);
                    
                    row.appendChild(nameCell);
                    row.appendChild(statusCell);
                    row.appendChild(actionCell);
                    
                    tbody.appendChild(row);
                });
                
                table.appendChild(tbody);
                peopleListContainer.appendChild(table);
            } else {
                const noReservations = document.createElement('p');
                noReservations.className = 'text-muted';
                noReservations.textContent = 'Aucune réservation pour ce jour.';
                peopleListContainer.appendChild(noReservations);
            }
        }
        
        // Function to apply filters and update the displayed list
        function applyFilters() {
            const searchText = document.getElementById('searchPeople').value.toLowerCase();
            const selectedStatus = document.getElementById('statusFilter').value;
            
            let filteredResults = originalReservations;
            
            // Filter by name if search text exists
            if (searchText) {
                filteredResults = filteredResults.filter(reservation => 
                    reservation.user_name.toLowerCase().includes(searchText)
                );
            }
            
            // Filter by status if a specific status is selected
            if (selectedStatus !== 'all') {
                filteredResults = filteredResults.filter(reservation => 
                    reservation.status === selectedStatus
                );
            }
            
            // Render the filtered list
            renderPeopleList(filteredResults);
        }
        
        // Add event listeners for filtering
        document.getElementById('searchPeople').addEventListener('input', applyFilters);
        document.getElementById('statusFilter').addEventListener('change', applyFilters);
        
        // Initial render of people list
        renderPeopleList(originalReservations);
        
        // Show the modal
        dayDetailsModal.show();
    }

    // Function to calculate statistics by status
    function calculateStatusStats(reservations) {
        const stats = {};
        
        if (reservations && reservations.length > 0) {
            reservations.forEach(reservation => {
                const status = reservation.status;
                if (stats[status]) {
                    stats[status]++;
                } else {
                    stats[status] = 1;
                }
            });
        }
        
        // Add total count
        stats['Total'] = reservations ? reservations.length : 0;
        
        return stats;
    }

    // Function to format date for display (DD/MM/YYYY)
    function formatDisplayDate(dateString) {
        const parts = dateString.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
