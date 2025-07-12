document.addEventListener('DOMContentLoaded', function() {
    // Current date as starting point
    let currentDate = new Date();
    let currentDay = currentDate.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Variable to store the reservation deadline time (default: "11:00")
    let reservationDeadlineTime = "11:00";
    
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
                // Affiche le jour et la date dans un titre (h6)
                document.getElementById('reservationDay').textContent = getDayName(i) + ' ' + currentDay.getDate() + ' ' + currentDay.toLocaleDateString('fr-FR');
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

            // Afficher les extras EDS/Autre si > 0
            fetch(`/manager/api/extra_reservations?date=${dateKey}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const eds = data.extras.EDS || 0;
                        const autre = data.extras.Autre || 0;
                        if (eds > 0 || autre > 0) {
                            const extrasElem = document.createElement('div');
                            extrasElem.className = 'extra-counts mt-2';
                            if (eds > 0) {
                                const edsSpan = document.createElement('span');
                                edsSpan.textContent = `EDS: ${eds}`;
                                edsSpan.style.display = 'inline-block';
                                edsSpan.style.backgroundColor = '#f0f8ff';
                                edsSpan.style.color = '#007bff';
                                edsSpan.style.padding = '4px 8px';
                                edsSpan.style.borderRadius = '4px';
                                edsSpan.style.marginRight = '8px';
                                extrasElem.appendChild(edsSpan);
                            }
                            if (autre > 0) {
                                const autreSpan = document.createElement('span');
                                autreSpan.textContent = `Autre: ${autre}`;
                                autreSpan.style.display = 'inline-block';
                                autreSpan.style.backgroundColor = '#fff3cd';
                                autreSpan.style.color = '#856404';
                                autreSpan.style.padding = '4px 8px';
                                autreSpan.style.borderRadius = '4px';
                                extrasElem.appendChild(autreSpan);
                            }
                            userListContainer.appendChild(extrasElem);
                        }
                    }
                })
                .catch(() => {/* ignore errors */});

            dayCol.appendChild(dayHeader);
            dayCol.appendChild(userListContainer);
            daysContainer.appendChild(dayCol);
            dayCol.appendChild(addButton);
        }
    }

    // Function to show day details in modal
    function showDayDetails(dateKey, dayName, reservations) {
        const dayDetailsModal = new bootstrap.Modal(document.getElementById('dayDetailsModal'));
        document.getElementById('detailDayTitle').textContent = dayName + ' - ' + formatDisplayDate(dateKey);

        let stats = calculateStatusStats(reservations);

        // Ajout : charger les extra reservations pour ce jour et mettre à jour les stats
        fetch(`/manager/api/extra_reservations?date=${dateKey}`)
            .then(response => response.json())
            .then(data => {
                // Ajoute EDS et Autre dans les stats du haut
                if (data.success) {
                    const eds = data.extras.EDS || 0;
                    const autre = data.extras.Autre || 0;
                    if (eds > 0) stats['EDS'] = (stats['EDS'] || 0) + eds;
                    if (autre > 0) stats['Autre'] = (stats['Autre'] || 0) + autre;
                    // Met à jour le total
                    stats['Total'] = (stats['Total'] || 0) + eds + autre;
                    document.getElementById('edsCount').value = eds;
                    document.getElementById('autreCount').value = autre;
                } else {
                    document.getElementById('edsCount').value = 0;
                    document.getElementById('autreCount').value = 0;
                }
                // Affiche les stats (Total toujours en premier, puis le reste)
                const statsContainer = document.getElementById('statusStats');
                statsContainer.innerHTML = '';
                // Affiche d'abord le total
                if ('Total' in stats) {
                    const statElement = document.createElement('div');
                    statElement.className = 'stat-item text-center mb-3';
                    const count = document.createElement('h3');
                    count.textContent = stats['Total'];
                    const label = document.createElement('p');
                    label.textContent = 'Total';
                    statElement.appendChild(count);
                    statElement.appendChild(label);
                    statsContainer.appendChild(statElement);
                }
                // Puis les autres statuts (sauf Total)
                Object.keys(stats).forEach(status => {
                    if (status === 'Total') return;
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

                // Ajout de la colonne ID
                ['ID', 'Nom', 'Status', 'Actions'].forEach(header => {
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

                    // Colonne ID utilisateur
                    const idCell = document.createElement('td');
                    idCell.textContent = reservation.user_user_id || '-';
                    row.appendChild(idCell);

                    const nameCell = document.createElement('td');
                    nameCell.textContent = reservation.user_name;
                    row.appendChild(nameCell);

                    const statusCell = document.createElement('td');
                    
                    // Get the base status from the reservation
                    let baseStatus = reservation.user_status || 'Moniteur';
                    const isVolunteer = reservation.benevole;
                    
                    // Uniformise le statut bénévole pour l'affichage
                    let displayStatus = baseStatus;
                    if (isVolunteer) {
                        displayStatus = 'Bénévole';
                    }
                    
                    // Check if the user should have the bénévole option (only for Moniteur or Bar)
                    const canBeVolunteer = baseStatus === 'Moniteur' || baseStatus === 'Bar';
                    
                    if (canBeVolunteer) {
                        // Create status select dropdown
                        const statusSelect = document.createElement('select');
                        statusSelect.className = 'form-select form-select-sm status-select';
                        statusSelect.dataset.reservationId = reservation.id;
                        
                        // Regular status option
                        const regularOption = document.createElement('option');
                        regularOption.value = 'false';
                        regularOption.textContent = baseStatus;
                        regularOption.selected = !isVolunteer;
                        statusSelect.appendChild(regularOption);
                        
                        // Volunteer option
                        const volunteerOption = document.createElement('option');
                        volunteerOption.value = 'true';
                        volunteerOption.textContent = 'Bénévole';
                        volunteerOption.selected = isVolunteer;
                        statusSelect.appendChild(volunteerOption);
                        
                        // Add event listener for status change
                        statusSelect.addEventListener('change', function() {
                            const isVolunteer = this.value === 'true';
                            updateReservationStatus(reservation.id, isVolunteer);
                        });
                        
                        statusCell.appendChild(statusSelect);
                    } else {
                        // For other statuses, just display the status text
                        statusCell.textContent = displayStatus;
                    }
                    
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
                    
                    row.appendChild(idCell);
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
                filteredResults = filteredResults.filter(reservation => {
                    let status = reservation.status || '';
                    if (reservation.benevole) status = 'Bénévole';
                    return status === selectedStatus;
                });
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

        // Ajout : configurer le bouton "Ajouter" pour ouvrir le modal d'ajout de réservation pour ce jour
        const addBtn = document.getElementById('addReservationFromDayDetails');
        if (addBtn) {
            addBtn.onclick = function() {
                // Pré-remplir la date et le titre dans le modal d'ajout de réservation
                document.getElementById('reservationDate').value = dateKey;
                document.getElementById('reservationDay').textContent = dayName + ' ' + formatDisplayDate(dateKey);
                // Fermer le modal de détail du jour
                dayDetailsModal.hide();
                // Ouvrir le modal d'ajout de réservation
                const reservationModal = new bootstrap.Modal(document.getElementById('reservationModal'));
                reservationModal.show();
            };
        }
        
        // Ajout: charger les extra reservations pour ce jour
        fetch(`/manager/api/extra_reservations?date=${dateKey}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('edsCount').value = data.extras.EDS || 0;
                    document.getElementById('autreCount').value = data.extras.Autre || 0;
                } else {
                    document.getElementById('edsCount').value = 0;
                    document.getElementById('autreCount').value = 0;
                }
            });
        // Ajout: bouton enregistrer extra reservations
        document.getElementById('saveExtraReservationsBtn').onclick = function() {
            const eds = parseInt(document.getElementById('edsCount').value) || 0;
            const autre = parseInt(document.getElementById('autreCount').value) || 0;
            fetch('/manager/api/extra_reservations/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({
                    date: dateKey,
                    extras: { EDS: eds, Autre: autre }
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Feedback visuel
                    document.getElementById('extraReservationsSaved').style.display = '';
                    setTimeout(() => {
                        document.getElementById('extraReservationsSaved').style.display = 'none';
                    }, 1500);

                    // Fermer le modal des détails du jour
                    const modal = bootstrap.Modal.getInstance(document.getElementById('dayDetailsModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Refresh calendar
                    displayWeek(monday);
                }
            });
        };
    }

    // Function to update reservation status
    function updateReservationStatus(reservationId, isVolunteer) {
        fetch(`/api/update_reservation_status/${reservationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({ benevole: isVolunteer })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Visual feedback that status was updated
                const select = document.querySelector(`.status-select[data-reservation-id="${reservationId}"]`);
                if (select) {
                    // Brief visual feedback
                    select.classList.add('border-success');
                    setTimeout(() => {
                        select.classList.remove('border-success');
                    }, 1500);
                }
                
                // Close the modal after successful update
                const dayDetailsModal = bootstrap.Modal.getInstance(document.getElementById('dayDetailsModal'));
                if (dayDetailsModal) {
                    dayDetailsModal.hide();
                }
                
                // Refresh the calendar display
                displayWeek(monday);
            } else {
                console.error('Error updating status:', data.error);
                alert('Erreur lors de la mise à jour du statut: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Erreur lors de la mise à jour du statut');
        });
    }
    
    // Add this new API endpoint function to fetch reservations for a specific day
    function fetchDayReservations(date) {
        return fetch(`/api/day-reservations?date=${date}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    return data.reservations;
                } else {
                    console.error('Error fetching day reservations:', data.error);
                    return [];
                }
            })
            .catch(error => {
                console.error('Error:', error);
                return [];
            });
    }
    
    document.getElementById('validateReservation').addEventListener('click', function() {
        const reservationDate = document.getElementById('reservationDate').value;
        let userId = document.getElementById('userDropdown').value;
        const userIdInput = document.getElementById('userIdInput').value;
        const isVolunteer = document.getElementById('isVolunteerCheckbox').checked;

        // Si l'input id est rempli, on l'utilise pour trouver l'utilisateur correspondant
        if (userIdInput) {
            // Normalise l'id à 2 chiffres (ex: "1" => "01")
            const normalizedId = userIdInput.padStart(2, '0');
            const user = (window.allUsers || []).find(u => u.user_id === normalizedId);
            if (user) {
                userId = user.id;
            } else {
                alert("Aucun utilisateur avec cet ID.");
                return;
            }
        }
        
        fetch('api/create_reservation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({ 
                date: reservationDate, 
                user_id: userId,
                benevole: isVolunteer
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
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
    
    // Function to calculate statistics by status from an array of reservations
    function calculateStatusStats(reservations) {
        const stats = {};

        if (reservations && reservations.length > 0) {
            reservations.forEach(reservation => {
                // Uniformise le statut bénévole
                let status = reservation.status || 'Non défini';
                if (
                    status === 'Bénévole' ||
                    (reservation.benevole === true)
                ) {
                    status = 'Bénévole';
                }
                if (!stats[status]) {
                    stats[status] = 0;
                }
                stats[status]++;
            });
        }

        // Always include a total count
        stats['Total'] = reservations ? reservations.length : 0;

        return stats;
    }
    
    // Function to format date string from API format (YYYY-MM-DD) to display format (DD/MM/YYYY)
    function formatDisplayDate(dateString) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            // Convert YYYY-MM-DD to DD/MM/YYYY
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateString; // Return the original string if it's not in expected format
    }
    
    // Initial display
    displayWeek(monday);
    
    // Export Functionality
    // ---------------------------------------------------------
    
    // Initialize date pickers when modal is shown
    const exportModal = document.getElementById('exportModal');
    exportModal.addEventListener('shown.bs.modal', function() {
        // Initialize only if not already initialized
        if (!document.querySelector('.datepicker')) {
            // Load the jQuery and datepicker scripts if not already loaded
            if (typeof $.fn.datepicker === 'undefined') {
                loadScript('https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js')
                    .then(() => loadScript('https://cdn.jsdelivr.net/npm/bootstrap-datepicker@1.9.0/dist/js/bootstrap-datepicker.min.js'))
                    .then(() => loadCSS('https://cdn.jsdelivr.net/npm/bootstrap-datepicker@1.9.0/dist/css/bootstrap-datepicker.min.css'))
                    .then(() => initDatePickers())
                    .then(() => fetchReservationStats())
                    .catch(error => console.error('Error loading scripts:', error));
            } else {
                initDatePickers();
                fetchReservationStats();
            }
        } else {
            fetchReservationStats();
        }
    });
    
    // Function to fetch reservation statistics
    function fetchReservationStats() {
        const startDate = document.getElementById('exportStartDate').value;
        const endDate   = document.getElementById('exportEndDate').value;

        const formattedStartDate = convertDateFormat(startDate);
        const formattedEndDate = convertDateFormat(endDate);

        // if dates not selected, show invitation text
        if (!startDate || !endDate) {
            document.getElementById('reservationStats').innerHTML = `
                <p class="text-center text-muted">
                    Veuillez sélectionner une date de début et une date de fin pour afficher les statistiques.
                </p>`;
            return;
        }

        // Show loading indicator
        document.getElementById('reservationStats').innerHTML = `
            <div class="text-center mb-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p>Chargement des statistiques...</p>
            </div>
        `;
        
        // Build query parameters
        let queryParams = new URLSearchParams();
        if (formattedStartDate) queryParams.append('start_date', formattedStartDate);
        if (formattedEndDate)   queryParams.append('end_date', formattedEndDate);

        // Fetch stats from API
        fetch(`/manager/api/reservation-stats?${queryParams.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayReservationStats(data.stats);
                } else {
                    displayStatsError(data.error || 'Une erreur est survenue lors du chargement des statistiques');
                }
            })
            .catch(error => {
                console.error('Error fetching stats:', error);
                displayStatsError('Une erreur est survenue lors du chargement des statistiques');
            });
    }
    
    // Function to convert date format if needed
    function convertDateFormat(dateString) {
        if (!dateString) return '';
        
        // Check if it's in YYYY-MM-DD format
        const yyyyMmDdRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (yyyyMmDdRegex.test(dateString)) {
            // Convert from YYYY-MM-DD to DD/MM/YYYY
            const parts = dateString.split('-');
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        
        return dateString; // Return the original string if it's already correct
    }
    
    // Function to display reservation statistics
    function displayReservationStats(stats) {
        const statsContainer = document.getElementById('reservationStats');
        
        let html = `
            <div class="card mb-3">
                <div class="card-body text-center">
                    <h3>${stats.total_meals}</h3>
                    <p>Nombre total de repas</p>
                </div>
            </div>
            <div class="card mb-3">
                <div class="card-header">Repas par statut</div>
                <div class="card-body">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Statut</th>
                                <th>Nombre de repas</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // lignes existantes par statut
        for (const [status, count] of Object.entries(stats.by_status)) {
            html += `
                <tr>
                    <td>${status}</td>
                    <td>${getCountValue(count)}</td>
                </tr>
            `;
        }
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="card">
                <div class="card-header">Repas par utilisateur</div>
                <div class="card-body">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Utilisateur</th>
                                <th>Total repas</th>
                                <th>Voile</th>
                                <th>Bar</th>
                                <th>Bénévole</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // build rows using the new per-user counts
        for (const [user, count] of Object.entries(stats.by_user)) {
            // Ajout récupération de l'id utilisateur si présent
            const userId = count.user_id || '-';
            html += `
                <tr>
                    <td>${userId}</td>
                    <td>${user}</td>
                    <td>${getCountValue(count.total)}</td>
                    <td>${getCountValue(count.voile)}</td>
                    <td>${getCountValue(count.bar)}</td>
                    <td>${getCountValue(count.benevole)}</td>
                </tr>
            `;
        }
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Calculer total incluant extras
        const extrasTotal = (stats.extras?.EDS || 0) + (stats.extras?.Autre || 0);
        html = html.replace(
            `<h3>${stats.total_meals}</h3>`,
            `<h3>${stats.total_meals + extrasTotal}</h3>`
        );

        statsContainer.innerHTML = html;
    }
    
    // Function to display stats error
    function displayStatsError(errorMessage) {
        const statsContainer = document.getElementById('reservationStats');
        statsContainer.innerHTML = `
            <div class="alert alert-danger">
                ${errorMessage}
            </div>
        `;
    }
    
    // Update statistics when date changes
    document.getElementById('exportStartDate').addEventListener('change', fetchReservationStats);
    document.getElementById('exportEndDate').addEventListener('change', fetchReservationStats);
    
    // Function to dynamically load a script
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Function to dynamically load CSS
    function loadCSS(url) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }
    
    // Initialize the date pickers
    function initDatePickers() {
        $('#exportStartDate, #exportEndDate').datepicker({
            format: 'dd/mm/yyyy',
            autoclose: true,
            todayHighlight: true,
            language: 'fr',
            todayBtn: 'linked',
            clearBtn: true
        });
        
        // Set default dates - start date as today - 30 days, end date as today
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        $('#exportStartDate').datepicker('setDate', thirtyDaysAgo);
        $('#exportEndDate').datepicker('setDate', today);
    }
    
    // Handle export button click
    document.getElementById('exportBtn').addEventListener('click', function() {
        const format = document.getElementById('exportFormat').value;
        const startDate = document.getElementById('exportStartDate').value;
        const endDate = document.getElementById('exportEndDate').value;
        
        // Validate the form
        if (!format) {
            alert('Veuillez sélectionner un format d\'exportation');
            return;
        }
        
        if (!startDate || !endDate) {
            alert('Veuillez sélectionner une date de début et de fin');
            return;
        }
        
        // Convert dates to the format expected by the backend if needed
        const formattedStartDate = convertDateFormat(startDate);
        const formattedEndDate = convertDateFormat(endDate);
        
        // Prepare the query string
        let queryParams = new URLSearchParams({
            format: format,
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });
        
        // Create the export URL and navigate to it
        const exportUrl = `/manager/api/export_reservations?${queryParams.toString()}`;
        window.open(exportUrl, '_blank');
    });
    
    // User Management Code
    // ---------------------------------------------------------
    
    // Load users when users modal is opened
    const usersModal = document.getElementById('usersModal');
    usersModal.addEventListener('show.bs.modal', function() {
        loadUsers();
    });
    
    // Handle add user button
    document.getElementById('addUserBtn').addEventListener('click', function() {
        // Reset form
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        document.getElementById('userFormModalLabel').textContent = 'Ajouter un utilisateur';
        document.getElementById('passwordFields').style.display = 'block';
        
        // Hide user ID field by default
        document.getElementById('userIdFieldContainer').style.display = 'none';
        
        // Show the form modal
        const userFormModal = new bootstrap.Modal(document.getElementById('userFormModal'));
        userFormModal.show();
    });
    
    // Handle save user button
    document.getElementById('saveUserBtn').addEventListener('click', function() {
        const userId = document.getElementById('userId').value;
        const userData = {
            name: document.getElementById('userName').value,
            username: document.getElementById('userUsername').value,
            email: document.getElementById('userEmail').value,
            status: document.getElementById('userStatus').value
        };
        
        // Add password if it's provided
        const password = document.getElementById('userPassword').value;
        if (password) {
            userData.password = password;
        }
        
        if (userId) {
            // Update existing user
            updateUser(userId, userData);
        } else {
            // Create new user
            if (!password) {
                alert('Le mot de passe est obligatoire pour un nouvel utilisateur');
                return;
            }
            createUser(userData);
        }
    });
    
    // Search functionality
    document.getElementById('userSearchInput').addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
        const rows = document.querySelectorAll('#usersTableBody tr');
        
        rows.forEach(row => {
            const name = row.querySelector('td:first-child').textContent.toLowerCase();
            const username = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            
            if (name.includes(searchText) || username.includes(searchText)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
    
    function loadUsers() {
        // Show loading message
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Chargement des utilisateurs...</td></tr>';
        
        // Hide any previous errors
        document.getElementById('userLoadingError').style.display = 'none';
        
        
        fetch('/manager/api/users')
            .then(response => {
                return response.json();
            })
            .then(data => {
                
                if (data.success) {
                    if (data.users && data.users.length > 0) {
                        displayUsers(data.users);
                    } else {
                        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Aucun utilisateur trouvé</td></tr>';
                    }
                } else {
                    console.error('Error loading users:', data.error);
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erreur lors du chargement des utilisateurs</td></tr>';
                    
                    // Show error message
                    const errorElement = document.getElementById('userLoadingError');
                    errorElement.textContent = 'Erreur: ' + (data.error || 'Impossible de charger les utilisateurs');
                    errorElement.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erreur lors du chargement des utilisateurs</td></tr>';
                
                // Show error message
                const errorElement = document.getElementById('userLoadingError');
                errorElement.textContent = 'Erreur: ' + error.message;
                errorElement.style.display = 'block';
            });
    }
    
    function displayUsers(users) {
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            
            const idCell = document.createElement('td');
            idCell.textContent = user.user_id ? user.user_id : '-';
            
            const nameCell = document.createElement('td');
            nameCell.textContent = user.name;
            row.appendChild(nameCell);

            const usernameCell = document.createElement('td');
            usernameCell.textContent = user.username;
            row.appendChild(usernameCell);

            const statusCell = document.createElement('td');
            statusCell.textContent = user.status;
            row.appendChild(statusCell);
            
            const actionsCell = document.createElement('td');
            
            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-outline-primary me-2';
            editButton.innerHTML = '<i class="bi bi-pencil"></i> Modifier';
            editButton.addEventListener('click', () => editUser(user));
            
            actionsCell.appendChild(editButton);
            
            row.appendChild(idCell);
            row.appendChild(nameCell);
            row.appendChild(usernameCell);
            row.appendChild(statusCell);
            row.appendChild(actionsCell);
            
            tableBody.appendChild(row);
        });
    }
    
    function editUser(user) {
        // Affiche l'id utilisateur en lecture seule lors de l'édition
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userStatus').value = user.status;
        document.getElementById('userPassword').value = '';
        document.getElementById('userIdField').value = user.user_id || '';
        document.getElementById('userIdFieldContainer').style.display = 'block';
        
        // Change the title and hide password field (optional for edit)
        document.getElementById('userFormModalLabel').textContent = 'Modifier un utilisateur';
        document.getElementById('passwordFields').style.display = 'block';
        
        // Show the modal
        const userFormModal = new bootstrap.Modal(document.getElementById('userFormModal'));
        userFormModal.show();
    }
    
    function createUser(userData) {
        fetch('/manager/api/users/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('userFormModal'));
                modal.hide();

                // Reload users list in the user management table
                loadUsers();

                // Refresh the dropdown for reservation creation
                fetch('/manager/api/users')
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            window.allUsers = data.users;
                            populateUserDropdown(data.users);
                        }
                    });
            } else {
                alert('Erreur lors de la création: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Une erreur est survenue lors de la création');
        });
    }
    
    function updateUser(userId, userData) {
        fetch(`/manager/api/users/update/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('userFormModal'));
                modal.hide();
                
                // Reload users list
                loadUsers();
            } else {
                alert('Erreur lors de la mise à jour: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Une erreur est survenue lors de la mise à jour');
        });
    }
    
    // Settings Management Code
    // ---------------------------------------------------------
    
    // Load settings when settings modal is opened
    document.querySelector('.btn.btn-primary').addEventListener('click', function() {
        loadSettings();
        const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
        settingsModal.show();
    });
    
    // Handle save settings button
    document.getElementById('saveSettingsBtn').addEventListener('click', function() {
        const deadlineTime = document.getElementById('deadlineTime').value;
        if (!deadlineTime) {
            alert('Veuillez spécifier une heure limite valide');
            return;
        }
        
        saveSettings({
            deadline_time: deadlineTime
        });
    });
    
    function loadSettings() {
        // Show loading state
        document.getElementById('settingsSaved').style.display = 'none';
        document.getElementById('settingsError').style.display = 'none';
        
        fetch('/api/get-settings')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Populate form with settings
                    document.getElementById('deadlineTime').value = data.settings.deadline_time || "11:00";
                    
                    // Update global variable
                    reservationDeadlineTime = data.settings.deadline_time || "11:00";
                } else {
                    console.error('Error loading settings:', data.error);
                    document.getElementById('settingsError').textContent = 'Erreur lors du chargement des paramètres: ' + data.error;
                    document.getElementById('settingsError').style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('settingsError').textContent = 'Une erreur est survenue lors du chargement des paramètres';
                document.getElementById('settingsError').style.display = 'block';
            });
    }
    
    function saveSettings(settingsData) {
        fetch('/manager/api/settings/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(settingsData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('settingsSaved').style.display = 'block';
                document.getElementById('settingsError').style.display = 'none';
                
                // Update global variable
                reservationDeadlineTime = settingsData.deadline_time;
                
                // Hide success message after 3 seconds
                setTimeout(() => {
                    document.getElementById('settingsSaved').style.display = 'none';
                }, 3000);
            } else {
                console.error('Error saving settings:', data.error);
                document.getElementById('settingsError').textContent = 'Erreur lors de l\'enregistrement: ' + data.error;
                document.getElementById('settingsError').style.display = 'block';
                document.getElementById('settingsSaved').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('settingsError').textContent = 'Une erreur est survenue lors de l\'enregistrement';
            document.getElementById('settingsError').style.display = 'block';
            document.getElementById('settingsSaved').style.display = 'none';
        });
    }
    
    // Helper function to get CSRF token
    function getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    }
    
    // Initial settings load
    fetch('/api/get-settings')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                reservationDeadlineTime = data.settings.deadline_time || "11:00";
            }
        })
        .catch(error => {
            console.error('Error loading initial settings:', error);
        });
    
    // Add event listener to the user dropdown in the reservation modal
    document.getElementById('userDropdown').addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const userStatus = selectedOption.getAttribute('data-status');
        const volunteerCheckboxContainer = document.getElementById('volunteerCheckboxContainer');
        
        // Show checkbox only if the user is Moniteur or Bar
        if (userStatus === 'Moniteur' || userStatus === 'Bar') {
            volunteerCheckboxContainer.style.display = 'block';
        } else {
            volunteerCheckboxContainer.style.display = 'none';
            document.getElementById('isVolunteerCheckbox').checked = false; // Uncheck if hidden
        }
    });
    
    function getCountValue(count) {
        if (typeof count === 'number') return count;
        if (typeof count === 'object' && count !== null) {
            // Try common property names for the count value
            if (count.count !== undefined) return count.count;
            if (count.value !== undefined) return count.value;
            if (count.total !== undefined) return count.total;
            // If no known property found, return first number property
            for (const key in count) {
                if (typeof count[key] === 'number') {
                    return count[key];
                }
            }
        }
        return 0; // Default fallback
    }
    
    // Lors du chargement initial, stocker la liste des utilisateurs pour la recherche par id
    window.addEventListener('DOMContentLoaded', function() {
        fetch('/manager/api/users')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.allUsers = data.users;
                    populateUserDropdown(data.users);
                }
            });
    });
    
    // Ajout de l'id dans le menu déroulant d'ajout de réservation
    function populateUserDropdown(users) {
        const dropdown = document.getElementById('userDropdown');
        dropdown.innerHTML = '<option value="" disabled selected>Choisir un utilisateur</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.setAttribute('data-status', user.status);
            if (user.user_id) {
                option.textContent = `[${user.user_id}] ${user.name}`;
            } else {
                option.textContent = user.name;
            }
            dropdown.appendChild(option);
        });
    }


    
    // Ajout de l'id dans le menu déroulant d'ajout de réservation
    function populateUserDropdown(users) {
        const dropdown = document.getElementById('userDropdown');
        dropdown.innerHTML = '<option value="" disabled selected>Choisir un utilisateur</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.setAttribute('data-status', user.status);
            if (user.user_id) {
                option.textContent = `[${user.user_id}] ${user.name}`;
            } else {
                option.textContent = user.name;
            }
            dropdown.appendChild(option);
        });
    }

});
