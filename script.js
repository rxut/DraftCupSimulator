let currentBudget = 2700;  // Default budget
let playersData = [];      // Will hold player data
let flagsData = [];
let draftMode = false;
let round = 0;
let teams = [];
let captains = {};
let round2BudgetLimit = 0;
let round3BudgetLimit = 0;
let draftHistory = [];
let timerId;
let resetTeamsButton = document.getElementById('resetTeamsButton');

document.getElementById('draftModeButton').addEventListener('click', () => {
    draftMode = !draftMode;
    if (draftMode) {
        document.getElementById('draftModeButton').innerText = 'Stop Draft Mode';
        startDraftMode();
    } else {
        document.getElementById('draftModeButton').innerText = 'Start Draft Mode';
        stopDraftMode(true);
    }
});

function startDraftMode() {
    document.getElementById('undoButton').disabled = false;
    resetTeamsButton.disabled = true;
    document.getElementById('captainsContainer').style.display = 'block';
    resetTeams();
    // Get the round budget limits from the input fields
    const round1BudgetLimit = parseInt(document.getElementById('round1Budget').value, 10);
    round2BudgetLimit = parseInt(document.getElementById('round2Budget').value, 10);
    round3BudgetLimit = parseInt(document.getElementById('round3Budget').value, 10);

    // Get all captains
    console.log('Captains:', captains);

    // Calculate initial team budgets and sort teams
    teams = Array.from(document.querySelectorAll('.team')).map(team => {
        // Find the captain for this team
        const captain = captains[team.id];
        console.log(`Team id: ${team.id}, Captain: ${captain ? captain.name : 'N/A'}`);
        let captainRating = 0;
        let captainName = '';  
        if (captain) {
            captainRating = captain.rating;
            captainName = captain.name;
        } else {
            console.log(`No captain found for ${team.id}`);
        }
        return {
            id: team.id,
            name: captainName,
            initialBudget: 1000 - captainRating,
            roundBudget: 0,
            playersPicked: [], 
            players: team.querySelectorAll('.player').length,  // Update the players property
            round1TotalBudget: 1000 - captainRating + round1BudgetLimit,
            round2TotalBudget: 0, // Will be calculated after round 1
            round3TotalBudget: 0  // Will be calculated after round 2
        };
    });
    teams.sort((a, b) => b.initialBudget - a.initialBudget || a.name.localeCompare(b.name));  // Sort in descending order by budget, then in ascending order by name

    // Start round 1
    round = 1;
    teams.forEach(team => team.roundBudget = team.round1TotalBudget);

    setTimeout(highlightNextTeam, 200);
}

function stopDraftMode(manualStop = false) {

    // If not all teams have 4 players and the function was not called manually, do nothing
    if (!manualStop && !teams.every(team => team.players === 4)) {
        console.log('Draft mode not stopped: Not all teams have 4 players and the stop was not manual.');
        return;
    }

    if (teams.every(team => team.players === 4)) {
        document.getElementById('draftModeButton').innerText = 'Start Draft Mode';
        draftMode = false;
        console.log('Draft mode stopped: All teams have 4 players.');
        return;
    }
    
    draftMode = false;
    round = 0;

    // Update the players count for each team
    teams = teams.map(team => {
        const teamElement = document.getElementById(team.id);
        const playersCount = teamElement.querySelectorAll('.player').length;
        return {
            ...team,
            players: playersCount
        };
    });

    // Remove team highlights
    document.querySelectorAll('.team').forEach(team => team.style.outline = '');

    // Add player slots to each team until the total number of players and slots is 4
    document.querySelectorAll('.team').forEach(team => {
        while (team.querySelectorAll('.player, .player-slot').length < 4) {
            const playerSlot = document.createElement('div');
            playerSlot.className = 'player-slot';
            team.appendChild(playerSlot);
        }
    });

    document.querySelectorAll('.player.drafted').forEach(player => {
        player.classList.remove('drafted');
    });

    document.querySelectorAll('.player.too-expensive').forEach(player => {
        player.classList.remove('too-expensive');
    });

    document.querySelectorAll('.player').forEach(player => {
        player.setAttribute('draggable', true);
    });

    teams.forEach(team => {
        const roundBudgetSpan = document.getElementById(`${team.id}-round-budget`);
        if (roundBudgetSpan) {
            roundBudgetSpan.style.display = "none";
        }
    });
    // Initialize drag and drop functionality for the new player slots
    initializeDragAndDrop();
    resetTeamsButton.disabled = false;
    document.getElementById('undoButton').disabled = true;
    document.getElementById('captainsContainer').style.display = 'none';
}

function highlightNextTeam() {
    // Remove highlight from all teams
    document.querySelectorAll('.team').forEach(team => team.style.outline = '');

    if (teams.every(team => team.players === round)) {
        round++;
        // Do not exceed the maximum number of rounds
        if (round > 3) {
            console.log('Maximum number of rounds reached.');
            return;
        }
        if (round === 2) {
            teams.forEach(team => {
                const playerPickedRating = team.playersPicked[0] || 0;  // Get the rating of the player picked in round 1
                team.round2TotalBudget = team.round1TotalBudget - playerPickedRating + round2BudgetLimit;
                team.roundBudget = team.round2TotalBudget;
                updateTeamInfo(team.id);                
            });
        } else if (round === 3) {
            teams.forEach(team => {
                const playerPickedRating = team.playersPicked[1] || 0;  // Get the rating of the player picked in round 2
                team.round3TotalBudget = team.round2TotalBudget - playerPickedRating + round3BudgetLimit;
                team.roundBudget = team.round3TotalBudget;
                updateTeamInfo(team.id);
            });
        }
        // Re-sort teams based on round budget
        teams.sort((a, b) => b.roundBudget - a.roundBudget || a.name.localeCompare(b.name));
    }
	
    // Find the current team that can pick a player
    const currentTeam = teams.find(team => team.players < round);
    if (currentTeam) {
        // Highlight the team
        document.getElementById(currentTeam.id).style.outline = '2px solid green';
    }
	
	const roundPickOrder = []
	for (let i = 0; i < teams.length; i++) {
		const pickTeam = teams[i]
		
		if (pickTeam.name === currentTeam.name) {
			continue;
		}
		
		if (pickTeam.players < round) {
			roundPickOrder.push(pickTeam.name);
		}
	}
	
	const pickOrderStr = roundPickOrder.join(' ');
	
    // Find the next team that can pick a player
    const nextTeamIndex = teams.findIndex(team => team.players < round) + 1;
    const nextTeam = teams[nextTeamIndex % teams.length];

    const captainsContainer = document.getElementById('captainsContainer');

    captainsContainer.innerHTML = '';  // Clear the container
    captainsContainer.style.display = 'block';
    
	// Add the timer
    const timerHeader = document.createElement('h3');
	timerHeader.id = 'pickTimerDisplay';
    captainsContainer.appendChild(timerHeader);
	
    // Add the current round
    const roundHeader = document.createElement('h3');
    roundHeader.textContent = `Round: ${round}`;
    captainsContainer.appendChild(roundHeader);

    // Add the current captain
    if (currentTeam && currentTeam.name) {
        const header1 = document.createElement('h3');
        header1.textContent = 'Current Pick';
        captainsContainer.appendChild(header1);
    
        const captainElement = document.createElement('div');
        const captainData = captains[currentTeam.id];
        if (captainData) {
            captainElement.textContent = currentTeam.name;
    
            const flagData = flagsData.find(flag => flag.Country === captainData.country);
            if (flagData) {
                const flagElement = document.createElement('img');
                flagElement.src = flagData.Flag;
                flagElement.className = 'flag-icon';
                captainElement.prepend(flagElement);
            }
        }
        captainElement.className = 'captain'; 
        captainsContainer.appendChild(captainElement);
    }
    

    // Add the next pick order
    const header2 = document.createElement('h3');
    header2.textContent = 'Upcoming Picks';
    captainsContainer.appendChild(header2);
    roundPickOrder.forEach((captainName, index) => {
        const captainElement = document.createElement('div');
        // Find the team associated with the captain
        const team = teams.find(team => team.name === captainName);
        if (team) {
            const captainData = captains[team.id];
            if (captainData) {
                const numberText = document.createTextNode(`${index + 1}. `);  // Create a separate text node for the number
                captainElement.appendChild(numberText);  // Append the number text node to the captain element

                const flagData = flagsData.find(flag => flag.Country === captainData.country);
                if (flagData) {
                    const flagElement = document.createElement('img');
                    flagElement.src = flagData.Flag;
                    flagElement.className = 'flag-icon';
                    captainElement.appendChild(flagElement);  // Append the flag element to the captain element
                }

                const nameText = document.createTextNode(captainName);  // Create a separate text node for the name
                captainElement.appendChild(nameText);  // Append the name text node to the captain element
            }
        }
        captainElement.className = 'captain'; 
        captainsContainer.appendChild(captainElement);
    });
	
	highlightAvailablePlayers(currentTeam);
	captainPickTimer();
}

function highlightAvailablePlayers(currentTeam) {
	const teamData = teams.find(t => t.id === currentTeam.id);
	
	const teamRoundBudget = teamData.roundBudget;
	
	const undraftedPlayers = $(".player:not(.drafted):not(.captain)");
	$(undraftedPlayers).each(function (index) {
		const playerRating = parseInt($(this).attr('data-rating'));
		$(this).removeClass('in-budget too-expensive');
		$(this).attr('draggable', true);
		
		if (playerRating > teamRoundBudget) {
			$(this).addClass('too-expensive');
			$(this).attr('draggable', false);
		} else {
			$(this).addClass('in-budget');
		}
	});
	
	sortPlayers();
}

function captainPickTimer() {
    clearInterval(timerId);  // Clear the previous timer

    var sec = 180;
    timerId = setInterval(function(){
        document.getElementById('pickTimerDisplay').innerHTML = 'Remaining: ' + sec + ' seconds';
        sec--;
        if (sec < 0) {
            clearInterval(timerId);
        }
    }, 1000);
}
// Function to load players from the JSON file
function loadPlayers() {
    // Fetch flags data first
    fetch('flags.json')
        .then(response => response.json())
        .then(data => {
            flagsData = data;

            // Then fetch players data
            fetch('players.json')
                .then(response => response.json())
                .then(data => {
                    playersData = data;
                    createPlayerElements(data);
                    assignCaptainsToTeams(data);  // Assign captains to teams
                    initializeTeams();  // Initialize team info
                    sortPlayers();

                    // Initialize drag and drop functionality after players are created
                    initializeDragAndDrop();

                    // Load saved data after fetching player data
                    loadData();
                })
                .catch(error => console.error('Error loading player data:', error));
        })
        .catch(error => console.error('Error loading flags data:', error));
}

function createPlayerElements(players) {
    const playersContainer = document.getElementById('players');
    playersContainer.innerHTML = ''; // Clear existing players
    players.filter(player => player.Role === 'Player').forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player in-budget';
        playerDiv.draggable = true;
        
        playerDiv.id = player.Player; // Unique identifier

        // Get flag URL
        const flagData = flagsData.find(flag => flag.Country === player.Country);
        if (flagData) {
            const flagElement = document.createElement('img');
            flagElement.src = flagData.Flag;
            flagElement.className = 'flag-icon';
            playerDiv.appendChild(flagElement);
        }

        const playerText = document.createTextNode(`${player.Player} - Rating: ${player.Rating}`);
        playerDiv.appendChild(playerText);
        playerDiv.setAttribute('data-rating', player.Rating);
        playersContainer.appendChild(playerDiv);
    });
}

function assignCaptainsToTeams(players) {
    // Get all captains and sort them by rating
    const captains = players.filter(player => player.Role === 'Captain');
    captains.sort((a, b) => a.Rating - b.Rating || a.Player.localeCompare(b.Player));

    // Assign each captain to a team
    captains.forEach((captain, index) => {
        captain.Team = `team${index + 1}`;
    });

    createTeamElements(players);
}

function createTeamElements(players) {
    for (let i = 1; i <= 12; i++) {
        const teamContainer = document.getElementById(`team${i}`);
        teamContainer.innerHTML = ''; // Clear team

        // Add the captain
        const captain = players.find(player => player.Role === 'Captain' && player.Team === `team${i}`);
        if (captain) {
            const captainDiv = document.createElement('div');
            captainDiv.className = 'player captain';  // Add 'captain' class
            captainDiv.textContent = `${captain.Player} - Rating: ${captain.Rating}`;
            captainDiv.setAttribute('data-rating', captain.Rating);

            // Get flag URL
            const flagData = flagsData.find(flag => flag.Code === captain.Code);
            if (flagData) {
                const flagElement = document.createElement('img');
                flagElement.src = flagData.Flag;
                flagElement.className = 'flag-icon';
                captainDiv.prepend(flagElement);  // Add the flag before the player's name
            }

            teamContainer.appendChild(captainDiv);
            sortPlayers();

            captains[`team${i}`] = {
                name: captain.Player,
                rating: captain.Rating,
                country: captain.Country 
            };
        }

        // Add three empty slots
        for (let j = 0; j < 3; j++) {
            const slot = document.createElement('div');
            slot.className = 'player-slot';
            teamContainer.appendChild(slot);
        }
    }
}

function initializeDragAndDrop() {
    document.querySelectorAll('.player').forEach(player => {
        player.addEventListener('dragstart', event => {
            if (!player.classList.contains('drafted')) {
                event.dataTransfer.setData('text/plain', event.target.id);
            } else {
                event.preventDefault();
            }
        });
    });

    document.querySelectorAll('.team').forEach(team => {
        team.addEventListener('dragover', event => {
            event.preventDefault();  // This allows the drop event
        });

        team.addEventListener('drop', event => {
            event.preventDefault();
            const playerId = event.dataTransfer.getData('text/plain');
            const player = document.getElementById(playerId);
            if (player) {
                // Store the old team ID before adding the player to the new team
                const oldTeamId = player.parentElement.id;
                
                if (draftMode) {
                    const teamData = teams.find(t => t.id === team.id);
                    const nextTeam = teams.find(t => t.players < round);

                    if (teamData && teamData === nextTeam && canAddPlayerToTeam(team, player)) {
                        const emptySlot = team.querySelector('.player-slot');
                        if (emptySlot) {
                            // Add player to team in DOM
                            team.replaceChild(player, emptySlot);
                            // Mark player as drafted
                            player.classList.add('drafted');
                            // Update team data
                            teamData.players++;
                            teamData.roundBudget -= parseInt(player.getAttribute('data-rating'), 10);
                            console.log(`Team ID: ${team.id}, Remaining Budget after pick: ${teamData.roundBudget}`);  // Log the remaining budget after the pick
                            // Update team's displayed info
                            updateTeamInfo(team.id);
                            // Save changes
                            saveData();
                            // After player has been added, check whether draft mode should continue
                            highlightNextTeam();
                        }
                        draftHistory.push({
                            action: 'add',
                            player: player.id,
                            team: team.id,
                            draftMode: draftMode,
                            round: round,
                            teams: JSON.parse(JSON.stringify(teams))  // Deep copy of the teams array
                        });

                    }
                } else {
                    if (canAddPlayerToTeam(team, player)) {
                        const emptySlot = team.querySelector('.player-slot');
                        if (emptySlot) {
                            team.replaceChild(player, emptySlot);
                        } else {
                            // If there are no empty slots, replace an existing player
                            team.replaceChild(player, team.querySelector('.player'));
                        }
                        fillEmptySlots(team);  // Fill the team with empty slots
                        updateTeamInfo(team.id);  // Update the team info of the new team
                        sortPlayers();
                        saveData();  // Save the teams after a player is moved
                    } else {
                        document.getElementById('players').appendChild(player);
                    }
                }
            
                // Create a new player slot in the old team if the player was moved from another team
                if (oldTeamId.startsWith('team') && player.parentElement.id !== oldTeamId) {
                    const oldTeam = document.getElementById(oldTeamId);
                    if (oldTeam.querySelectorAll('.player').length < 4) {
                        const playerSlot = document.createElement('div');
                        playerSlot.className = 'player-slot';
                        oldTeam.appendChild(playerSlot);
                    }
                    updateTeamInfo(oldTeamId);  // Update the team info of the old team
                    sortPlayers();
                }
            }
        });
    });

    // Add event listeners to the players div
    const playersDiv = document.getElementById('players');

    playersDiv.addEventListener('dragover', event => {
        event.preventDefault();
    });

    playersDiv.addEventListener('drop', event => {
        event.preventDefault();
        const playerId = event.dataTransfer.getData('text/plain');
        const player = document.getElementById(playerId);
        if (player) {
            // Store the old team ID before moving the player
            const oldTeamId = player.parentElement.id;
            // Remove player from any team and add back to the player list
            playersDiv.appendChild(player);
            // Remove 'drafted' class from player
            player.classList.remove('drafted');
            // Update the team info of the old team before removing the player
            if (oldTeamId !== 'players') {
                updateTeamInfo(oldTeamId);

                const oldTeam = document.getElementById(oldTeamId);
                fillEmptySlots(oldTeam);
            }
            // Sort players in the player list
            sortPlayers();
            // Save changes
            saveData();
        }
    });
    function fillEmptySlots(team) {
        while (team.querySelectorAll('.player, .player-slot').length < 4) {
            const playerSlot = document.createElement('div');
            playerSlot.className = 'player-slot';
            team.appendChild(playerSlot);
        }
    }
}

document.getElementById('undoButton').addEventListener('click', undoLastAction);

function undoLastAction() {
	if (draftHistory.length === 0) {
		return;
	}
    
	const isRoundRollback = (draftHistory.length % teams.length) === 0;
	
	const lastAction = draftHistory.pop();

    // Revert the state of the draft mode and teams
    draftMode = lastAction.draftMode;
    round = lastAction.round;
    teams = lastAction.teams;

	const player = document.getElementById(lastAction.player);
	const team = document.getElementById(lastAction.team);
	const teamData = teams.find(t => t.id === team.id);

    console.log(`Team ID: ${teamData.id}, Remaining Budget after undo: ${teamData.roundBudget}`);
	
	if (!player || !team || !teamData) {
		return;
	}

	// Remove player from team in DOM
	team.removeChild(player);
	// Remove 'drafted' class from player
	player.classList.remove('drafted');
	// Update team data
	teamData.players--;
	
	if (isRoundRollback) {
		round--;
		
		switch (round) {
			case 1:
				teams.forEach(team => {
					team.roundBudget = team.round1TotalBudget - team.playersPicked[0];
					updateTeamInfo(team.id);                
				});
				break;
			case 2:
				teams.forEach(team => {
                    team.roundBudget = team.round2TotalBudget - team.playersPicked[1];
                    updateTeamInfo(team.id);            
                });
				break;
			case 3:
				teams.forEach(team => {
					team.roundBudget = team.round3TotalBudget - team.playersPicked[2];
					updateTeamInfo(team.id);           
				});
				break;
            
		}
        teams.sort((a, b) => b.initialBudget - a.initialBudget || a.name.localeCompare(b.name));
	}

	teamData.roundBudget += parseInt(player.getAttribute('data-rating'), 10);

	// Update team's displayed info
	updateTeamInfo(team.id);
	// Save changes
	saveData();

	// Append player back to the Player List
	document.getElementById('players').appendChild(player);
	// Resort the Player List
	sortPlayers();

	// Create a new empty slot and append it to the team
	const playerSlot = document.createElement('div');
	playerSlot.className = 'player-slot';
	team.appendChild(playerSlot);
	
	// After player has been removed, check whether draft mode should continue
	highlightNextTeam();
}

function canAddPlayerToTeam(team, player) {
    let teamRating = Array.from(team.children).reduce((total, elem) => {
        return total + (elem.getAttribute('data-rating') ? parseInt(elem.getAttribute('data-rating'), 10) : 0);
    }, 0);
    let playerRating = parseInt(player.getAttribute('data-rating'), 10);

    // Check if there's an available slot in the team
    let availableSlots = Array.from(team.children).filter(elem => elem.className === 'player-slot').length;

    // If in Draft Mode, check if player's rating is less than or equal to the team's round budget
    if (draftMode) {
        const teamData = teams.find(t => t.id === team.id);
        if (teamData) {
            let roundBudget;
            if (round === 1) {
                roundBudget = teamData.round1TotalBudget;
            } else if (round === 2) {
                roundBudget = teamData.round2TotalBudget;
            } else if (round === 3) {
                roundBudget = teamData.round3TotalBudget;
            }
            console.log(`Team ID: ${team.id}, Round: ${round}, Round Budget: ${roundBudget}`);  // Log the round budget for the team

            // If the player can be added to the team, add the player's rating to the playersPicked array
            if (playerRating <= roundBudget && availableSlots > 0) {
                teamData.playersPicked.push(playerRating);
                return true;
            }
            return false;
        }
    }

    // If not in Draft Mode, check if the team rating plus player rating is less than or equal to the current budget
    return (teamRating + playerRating) <= currentBudget && availableSlots > 0;
}

function updateTeamInfo(teamId) {
    if (teamId === 'players') {
        return;
    }
    const team = document.getElementById(teamId);
    let teamRating = 0;

    team.querySelectorAll('.player').forEach(player => {
        teamRating += parseInt(player.getAttribute('data-rating'), 10);
    });

    const ratingSpan = document.getElementById(`${teamId}-rating`);
    const budgetSpan = document.getElementById(`${teamId}-budget`);
    
    ratingSpan.textContent = `Rating: ${teamRating}`;
    budgetSpan.textContent = `Remaining Budget: ${currentBudget - teamRating}`;

    // Change text color to red if team is over budget
    if (teamRating > currentBudget) {
        ratingSpan.style.color = 'red';
        budgetSpan.style.color = 'red';
    } else {
        ratingSpan.style.color = '';
        budgetSpan.style.color = '';
    }

    const roundBudgetSpan = document.getElementById(`${teamId}-round-budget`);
    if (roundBudgetSpan) {  // Check that roundBudgetSpan is not null
        if (draftMode) {
            const teamData = teams.find(t => t.id === teamId);
            if (teamData) {
                let roundBudget = teamData.roundBudget;
                roundBudgetSpan.textContent = `Round Budget Limit: ${roundBudget}`;
            }
            roundBudgetSpan.style.display = "";  // Show the round budget limit
        } else {
            roundBudgetSpan.style.display = "none";  // Hide the round budget limit
        }
    }
}

function setBudget() {
    const budgetInput = document.getElementById('budgetInput');
    currentBudget = parseInt(budgetInput.value, 10);
    saveData();
    initializeTeams();  // Update team info
}

function resetTeams() {

    // Remove all players from teams
    document.querySelectorAll('.team .player').forEach(player => {
        document.getElementById('players').appendChild(player);
    });

    // Reset playersData and currentBudget to their initial state
    playersData = [];
    currentBudget = 2700;

    // Clear saved team data
    localStorage.removeItem('teams');
    localStorage.removeItem('playersData');
    localStorage.removeItem('currentBudget');

    // Reload players and flags data
    loadPlayers();
	
    // Reinitialize drag and drop functionality
    initializeDragAndDrop();
}

function initializeTeams() {
    for (let i = 1; i <= 12; i++) {
        updateTeamInfo(`team${i}`);
    }
}

function sortPlayers() {
    const playersContainer = document.getElementById('players');
    const allPlayers = Array.from(playersContainer.getElementsByClassName('player'));
    
    // Sort players by rating
    allPlayers.sort((a, b) => parseInt(b.getAttribute('data-rating')) - parseInt(a.getAttribute('data-rating')));
    
    // Append sorted players to the container
    allPlayers.forEach(player => playersContainer.appendChild(player));
}

function saveData() {
    localStorage.setItem('playersData', JSON.stringify(playersData));
    localStorage.setItem('currentBudget', currentBudget.toString());
    localStorage.setItem('teams', JSON.stringify(Array.from(document.querySelectorAll('.team')).map(team => {
        return {
            id: team.id,
            players: Array.from(team.querySelectorAll('.player')).map(player => player.id)
        };
    })));
}

// Load data from localStorage
function loadData() {
    playersData = JSON.parse(localStorage.getItem('playersData')) || [];
    currentBudget = parseInt(localStorage.getItem('currentBudget'), 10) || 2700;
    const savedTeams = JSON.parse(localStorage.getItem('teams')) || [];
    savedTeams.forEach(savedTeam => {
        const team = document.getElementById(savedTeam.id);
        const playerSlots = Array.from(team.querySelectorAll('.player-slot'));
        const savedPlayers = savedTeam.players.map(playerId => document.getElementById(playerId)).filter(player => player);
        savedPlayers.sort((a, b) => parseInt(b.getAttribute('data-rating')) - parseInt(a.getAttribute('data-rating')));
        savedPlayers.forEach((player, index) => {
            if (playerSlots[index]) {
                team.replaceChild(player, playerSlots[index]);
            }
        });
    });
    document.getElementById('budgetInput').value = currentBudget;
    initializeTeams();

    // Initialize drag and drop functionality after player slots are created
    initializeDragAndDrop();
}
loadData();
loadPlayers();