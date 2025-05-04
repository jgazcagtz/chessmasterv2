// Chess game implementation
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const boardElement = document.getElementById('board');
    const historyList = document.getElementById('history-list');
    const playerColorSpan = document.getElementById('player-color');
    const gameStatusElement = document.getElementById('game-status');
    const timeSpan = document.getElementById('time');
    const levelSelect = document.getElementById('level-select');
    const computerBtn = document.getElementById('computer-btn');
    const twoPlayerBtn = document.getElementById('two-player-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const promotionModal = document.getElementById('promotion-modal');
    const promotionOptions = document.getElementById('promotion-options');
    const whiteCapturedElement = document.getElementById('white-captured');
    const blackCapturedElement = document.getElementById('black-captured');
    
    // Sounds
    const moveSound = document.getElementById('move-sound');
    const captureSound = document.getElementById('capture-sound');
    const checkSound = document.getElementById('check-sound');
    const checkmateSound = document.getElementById('checkmate-sound');
    
    // Game state
    let board = [];
    let selectedPiece = null;
    let currentPlayer = 'white';
    let moveHistory = [];
    let timerInterval = null;
    let elapsedTime = 0;
    let gameMode = 'two-player';
    let difficulty = 2;
    let gameActive = true;
    let castlingRights = {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true }
    };
    let enPassantTarget = null;
    let whiteCapturedPieces = [];
    let blackCapturedPieces = [];
    
    // Piece values for AI
    const pieceValues = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100,
        'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 100
    };
    
    // Initialize the game
    function initGame() {
        // Set up initial board position
        board = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
        
        // Reset game state
        currentPlayer = 'white';
        selectedPiece = null;
        moveHistory = [];
        historyList.innerHTML = '';
        whiteCapturedPieces = [];
        blackCapturedPieces = [];
        whiteCapturedElement.innerHTML = '';
        blackCapturedElement.innerHTML = '';
        gameActive = true;
        
        // Reset castling rights
        castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        
        enPassantTarget = null;
        elapsedTime = 0;
        updateTimer();
        clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        
        // Update UI
        playerColorSpan.textContent = 'White';
        playerColorSpan.className = 'white';
        gameStatusElement.textContent = '';
        gameStatusElement.className = '';
        
        renderBoard();
    }
    
    // Render the chess board
    function renderBoard() {
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                const piece = board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = 'piece';
                    pieceElement.textContent = getPieceUnicode(piece);
                    pieceElement.dataset.piece = piece;
                    pieceElement.dataset.row = row;
                    pieceElement.dataset.col = col;
                    pieceElement.addEventListener('click', handlePieceClick);
                    square.appendChild(pieceElement);
                }
                
                square.addEventListener('click', handleSquareClick);
                boardElement.appendChild(square);
            }
        }
        
        updateCapturedPiecesDisplay();
    }
    
    // Get Unicode symbol for a piece
    function getPieceUnicode(piece) {
        const pieces = {
            'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔',
            'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
        };
        return pieces[piece] || '';
    }
    
    // Handle piece selection
    function handlePieceClick(e) {
        if (!gameActive) return;
        
        const pieceElement = e.currentTarget;
        const row = parseInt(pieceElement.dataset.row);
        const col = parseInt(pieceElement.dataset.col);
        const piece = board[row][col];
        const pieceColor = piece === piece.toUpperCase() ? 'white' : 'black';
        
        // Only allow selecting current player's pieces
        if (pieceColor !== currentPlayer) return;
        
        // Deselect if clicking the same piece
        if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
            deselectPiece();
            return;
        }
        
        // Select the piece
        selectPiece(row, col, piece);
    }
    
    // Select a piece and show possible moves
    function selectPiece(row, col, piece) {
        deselectPiece();
        selectedPiece = { row, col, piece };
        
        // Highlight selected piece
        const squareIndex = row * 8 + col;
        boardElement.children[squareIndex].classList.add('selected');
        
        // Highlight valid moves
        const validMoves = getValidMoves(row, col, piece);
        validMoves.forEach(move => {
            const moveIndex = move.toRow * 8 + move.toCol;
            boardElement.children[moveIndex].classList.add('highlight');
        });
    }
    
    // Deselect the current piece
    function deselectPiece() {
        if (selectedPiece) {
            // Remove all highlights
            const squares = boardElement.querySelectorAll('.square');
            squares.forEach(square => {
                square.classList.remove('selected', 'highlight');
            });
            selectedPiece = null;
        }
    }
    
    // Handle square click for moving pieces
    function handleSquareClick(e) {
        if (!selectedPiece || !gameActive) return;
        
        const square = e.currentTarget;
        const toRow = parseInt(square.dataset.row);
        const toCol = parseInt(square.dataset.col);
        
        // Check if this is a valid move
        const validMoves = getValidMoves(selectedPiece.row, selectedPiece.col, selectedPiece.piece);
        const move = validMoves.find(m => m.toRow === toRow && m.toCol === toCol);
        
        if (move) {
            makeMove(move);
        }
    }
    
    // Get all valid moves for a piece
    function getValidMoves(row, col, piece) {
        const moves = [];
        const pieceType = piece.toLowerCase();
        const isWhite = piece === piece.toUpperCase();
        const directions = getPieceDirections(pieceType);
        
        // Standard moves based on piece type
        directions.forEach(direction => {
            const { type, vectors } = direction;
            
            if (type === 'single') {
                vectors.forEach(([dr, dc]) => {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (isInBounds(newRow, newCol)) {
                        const target = board[newRow][newCol];
                        if (target === '' || isEnemy(target, isWhite)) {
                            moves.push(createMove(row, col, newRow, newCol, target !== ''));
                        }
                    }
                });
            } else if (type === 'multiple') {
                vectors.forEach(([dr, dc]) => {
                    let newRow = row + dr;
                    let newCol = col + dc;
                    while (isInBounds(newRow, newCol)) {
                        const target = board[newRow][newCol];
                        if (target === '') {
                            moves.push(createMove(row, col, newRow, newCol, false));
                            newRow += dr;
                            newCol += dc;
                        } else {
                            if (isEnemy(target, isWhite)) {
                                moves.push(createMove(row, col, newRow, newCol, true));
                            }
                            break;
                        }
                    }
                });
            }
        });
        
        // Special moves
        if (pieceType === 'p') {
            addPawnMoves(row, col, piece, moves, isWhite);
        } else if (pieceType === 'k') {
            addCastlingMoves(row, col, isWhite, moves);
        }
        
        // Filter out moves that would leave king in check
        return moves.filter(move => !wouldLeaveKingInCheck(move, isWhite));
    }
    
    // Create a move object
    function createMove(fromRow, fromCol, toRow, toCol, isCapture, special = null) {
        return {
            fromRow, fromCol, toRow, toCol, 
            capture: isCapture, 
            special,
            piece: board[fromRow][fromCol]
        };
    }
    
    // Check if a position is within bounds
    function isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }
    
    // Check if a piece is an enemy
    function isEnemy(piece, isWhite) {
        return piece !== '' && (piece === piece.toUpperCase()) !== isWhite;
    }
    
    // Get movement directions for each piece type
    function getPieceDirections(pieceType) {
        const directions = [];
        
        switch (pieceType) {
            case 'n': // Knight
                directions.push({
                    type: 'single',
                    vectors: [
                        [-2, -1], [-2, 1],
                        [-1, -2], [-1, 2],
                        [1, -2], [1, 2],
                        [2, -1], [2, 1]
                    ]
                });
                break;
                
            case 'b': // Bishop
                directions.push({
                    type: 'multiple',
                    vectors: [
                        [-1, -1], [-1, 1],
                        [1, -1], [1, 1]
                    ]
                });
                break;
                
            case 'r': // Rook
                directions.push({
                    type: 'multiple',
                    vectors: [
                        [-1, 0], [1, 0],
                        [0, -1], [0, 1]
                    ]
                });
                break;
                
            case 'q': // Queen
                directions.push({
                    type: 'multiple',
                    vectors: [
                        [-1, -1], [-1, 1],
                        [1, -1], [1, 1],
                        [-1, 0], [1, 0],
                        [0, -1], [0, 1]
                    ]
                });
                break;
                
            case 'k': // King
                directions.push({
                    type: 'single',
                    vectors: [
                        [-1, -1], [-1, 1],
                        [1, -1], [1, 1],
                        [-1, 0], [1, 0],
                        [0, -1], [0, 1]
                    ]
                });
                break;
                
            case 'p': // Pawn (handled separately)
                break;
        }
        
        return directions;
    }
    
    // Add pawn-specific moves
    function addPawnMoves(row, col, piece, moves, isWhite) {
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        
        // Forward moves
        const oneForward = row + direction;
        if (isInBounds(oneForward, col) && board[oneForward][col] === '') {
            moves.push(createMove(row, col, oneForward, col, false));
            
            // Two squares forward from starting position
            const twoForward = row + 2 * direction;
            if (row === startRow && board[twoForward][col] === '') {
                moves.push(createMove(row, col, twoForward, col, false, 'double-pawn'));
            }
        }
        
        // Captures
        const captureDirections = [[direction, -1], [direction, 1]];
        captureDirections.forEach(([dr, dc]) => {
            const captureRow = row + dr;
            const captureCol = col + dc;
            if (isInBounds(captureRow, captureCol)) {
                const target = board[captureRow][captureCol];
                if (target !== '' && isEnemy(target, isWhite)) {
                    moves.push(createMove(row, col, captureRow, captureCol, true));
                }
                
                // En passant
                if (enPassantTarget && captureRow === enPassantTarget.row && captureCol === enPassantTarget.col) {
                    moves.push(createMove(row, col, captureRow, captureCol, true, 'en-passant'));
                }
            }
        });
    }
    
    // Add castling moves if available
    function addCastlingMoves(row, col, isWhite, moves) {
        const color = isWhite ? 'white' : 'black';
        
        // Kingside castling
        if (castlingRights[color].kingside) {
            const canCastle = [5, 6].every(c => board[row][c] === '') && 
                             !isSquareUnderAttack(row, 4, isWhite) &&
                             !isSquareUnderAttack(row, 5, isWhite) &&
                             !isSquareUnderAttack(row, 6, isWhite);
            if (canCastle) {
                moves.push(createMove(row, col, row, 6, false, 'castling-kingside'));
            }
        }
        
        // Queenside castling
        if (castlingRights[color].queenside) {
            const canCastle = [1, 2, 3].every(c => board[row][c] === '') && 
                             !isSquareUnderAttack(row, 4, isWhite) &&
                             !isSquareUnderAttack(row, 3, isWhite) &&
                             !isSquareUnderAttack(row, 2, isWhite);
            if (canCastle) {
                moves.push(createMove(row, col, row, 2, false, 'castling-queenside'));
            }
        }
    }
    
    // Check if a move would leave the king in check
    function wouldLeaveKingInCheck(move, isWhite) {
        // Make a temporary board
        const tempBoard = board.map(row => [...row]);
        const captured = executeMoveOnBoard(tempBoard, move);
        
        // Find the king's position
        const kingChar = isWhite ? 'K' : 'k';
        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (tempBoard[r][c] === kingChar) {
                    kingPos = { row: r, col: c };
                    break;
                }
            }
            if (kingPos) break;
        }
        
        // Check if king is under attack
        return kingPos ? isSquareUnderAttack(kingPos.row, kingPos.col, isWhite, tempBoard) : true;
    }
    
    // Execute a move on a board (without affecting the game state)
    function executeMoveOnBoard(tempBoard, move) {
        const { fromRow, fromCol, toRow, toCol, special } = move;
        const piece = tempBoard[fromRow][fromCol];
        let captured = tempBoard[toRow][toCol];
        
        // Move the piece
        tempBoard[toRow][toCol] = piece;
        tempBoard[fromRow][fromCol] = '';
        
        // Handle special moves
        if (special === 'en-passant') {
            const direction = piece === 'P' ? 1 : -1;
            captured = tempBoard[toRow + direction][toCol];
            tempBoard[toRow + direction][toCol] = '';
        } else if (special === 'castling-kingside') {
            tempBoard[toRow][5] = tempBoard[toRow][7];
            tempBoard[toRow][7] = '';
        } else if (special === 'castling-queenside') {
            tempBoard[toRow][3] = tempBoard[toRow][0];
            tempBoard[toRow][0] = '';
        } else if (special === 'promotion') {
            tempBoard[toRow][toCol] = move.promotion;
        }
        
        return captured;
    }
    
    // Check if a square is under attack
    function isSquareUnderAttack(row, col, isWhite, customBoard = null) {
        const boardToCheck = customBoard || board;
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardToCheck[r][c];
                if (piece === '' || (piece === piece.toUpperCase()) === isWhite) continue;
                
                const pieceType = piece.toLowerCase();
                const directions = getPieceDirections(pieceType);
                
                for (const direction of directions) {
                    const { type, vectors } = direction;
                    
                    for (const [dr, dc] of vectors) {
                        let newRow = r + dr;
                        let newCol = c + dc;
                        
                        if (type === 'single') {
                            if (newRow === row && newCol === col) return true;
                        } else if (type === 'multiple') {
                            while (isInBounds(newRow, newCol)) {
                                if (newRow === row && newCol === col) return true;
                                if (boardToCheck[newRow][newCol] !== '') break;
                                newRow += dr;
                                newCol += dc;
                            }
                        }
                    }
                }
                
                // Special case for pawn attacks
                if (pieceType === 'p') {
                    const direction = piece === 'P' ? -1 : 1;
                    if ((r + direction === row && (c - 1 === col || c + 1 === col))) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    // Make a move on the board
    function makeMove(move) {
        if (!gameActive) return;
        
        const { fromRow, fromCol, toRow, toCol, special, piece } = move;
        const isWhite = piece === piece.toUpperCase();
        let captured = board[toRow][toCol];
        
        // Play sound
        if (move.capture || special === 'en-passant') {
            captureSound.currentTime = 0;
            captureSound.play();
        } else {
            moveSound.currentTime = 0;
            moveSound.play();
        }
        
        // Move the piece
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = '';
        
        // Handle special moves
        if (special === 'double-pawn') {
            const direction = isWhite ? -1 : 1;
            enPassantTarget = { row: toRow + direction, col: toCol };
        } else {
            enPassantTarget = null;
        }
        
        if (special === 'en-passant') {
            const direction = isWhite ? 1 : -1;
            captured = board[toRow + direction][toCol];
            board[toRow + direction][toCol] = '';
        }
        
        if (special === 'castling-kingside') {
            board[toRow][5] = board[toRow][7];
            board[toRow][7] = '';
        }
        
        if (special === 'castling-queenside') {
            board[toRow][3] = board[toRow][0];
            board[toRow][0] = '';
        }
        
        // Handle pawn promotion
        if (piece.toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
            promptPromotion(toRow, toCol, isWhite);
            return; // Wait for promotion selection
        }
        
        // Update captured pieces
        if (captured) {
            if (isWhite) {
                whiteCapturedPieces.push(captured);
            } else {
                blackCapturedPieces.push(captured);
            }
        }
        
        // Update castling rights
        updateCastlingRights(move, piece, captured);
        
        // Add to move history
        addMoveToHistory(move, captured);
        
        // Switch player
        switchPlayer();
        
        // Check for game over conditions
        checkGameStatus();
        
        // Render the board
        renderBoard();
        
        // If it's computer's turn, make AI move
        if (gameMode === 'one-player' && currentPlayer === 'black' && gameActive) {
            setTimeout(computerMove, 500);
        }
    }
    
    // Update castling rights after a move
    function updateCastlingRights(move, piece, captured) {
        const color = piece === piece.toUpperCase() ? 'white' : 'black';
        
        // If king moves, lose both castling rights
        if (piece.toLowerCase() === 'k') {
            castlingRights[color] = { kingside: false, queenside: false };
        }
        
        // If rook moves from original position, lose corresponding castling right
        if (piece.toLowerCase() === 'r') {
            if (move.fromRow === (color === 'white' ? 7 : 0)) {
                if (move.fromCol === 0) castlingRights[color].queenside = false;
                if (move.fromCol === 7) castlingRights[color].kingside = false;
            }
        }
        
        // If rook is captured from original position, lose corresponding castling right
        if (captured && captured.toLowerCase() === 'r') {
            const capturedColor = captured === captured.toUpperCase() ? 'white' : 'black';
            if (move.toRow === (capturedColor === 'white' ? 7 : 0)) {
                if (move.toCol === 0) castlingRights[capturedColor].queenside = false;
                if (move.toCol === 7) castlingRights[capturedColor].kingside = false;
            }
        }
    }
    
    // Add move to history
    function addMoveToHistory(move, captured) {
        const { fromRow, fromCol, toRow, toCol, special, piece } = move;
        const isWhite = piece === piece.toUpperCase();
        const pieceType = piece.toLowerCase();
        
        let notation = '';
        
        // Castling notation
        if (special === 'castling-kingside') {
            notation = 'O-O';
        } else if (special === 'castling-queenside') {
            notation = 'O-O-O';
        } else {
            // Piece notation (except pawns)
            if (pieceType !== 'p') {
                notation += piece.toUpperCase();
            }
            
            // Capture notation
            if (move.capture) {
                if (pieceType === 'p') {
                    notation += String.fromCharCode(97 + fromCol);
                }
                notation += 'x';
            }
            
            // Destination square
            notation += String.fromCharCode(97 + toCol) + (8 - toRow);
            
            // Promotion notation
            if (special === 'promotion') {
                notation += '=' + move.promotion.toUpperCase();
            }
        }
        
        // Check/checkmate notation
        const tempBoard = board.map(row => [...row]);
        executeMoveOnBoard(tempBoard, move);
        const opponentColor = isWhite ? 'black' : 'white';
        if (isCheckmate(opponentColor, tempBoard)) {
            notation += '#';
        } else if (isInCheck(opponentColor, tempBoard)) {
            notation += '+';
        }
        
        // Add to history
        const moveNumber = Math.ceil(moveHistory.length / 2) + 1;
        const isWhiteMove = moveHistory.length % 2 === 0;
        
        if (isWhiteMove) {
            const moveEntry = document.createElement('div');
            moveEntry.className = 'move-entry';
            moveEntry.innerHTML = `
                <span>${moveNumber}.</span>
                <span>${notation}</span>
            `;
            historyList.appendChild(moveEntry);
        } else {
            const lastEntry = historyList.lastChild;
            if (lastEntry) {
                const span = document.createElement('span');
                span.textContent = notation;
                lastEntry.appendChild(span);
            }
        }
        
        moveHistory.push(notation);
    }
    
    // Prompt for pawn promotion
    function promptPromotion(row, col, isWhite) {
        promotionModal.style.display = 'flex';
        promotionOptions.innerHTML = '';
        
        const pieces = isWhite ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];
        pieces.forEach(p => {
            const option = document.createElement('div');
            option.className = 'promotion-option';
            option.textContent = getPieceUnicode(p);
            option.addEventListener('click', () => {
                board[row][col] = p;
                promotionModal.style.display = 'none';
                
                // Update captured pieces if promotion was a capture
                if (moveHistory.length > 0) {
                    const lastMove = moveHistory[moveHistory.length - 1];
                    if (lastMove.includes('x')) {
                        const capturedPiece = isWhite ? p.toLowerCase() : p.toUpperCase();
                        if (isWhite) {
                            whiteCapturedPieces.push(capturedPiece);
                        } else {
                            blackCapturedPieces.push(capturedPiece);
                        }
                        updateCapturedPiecesDisplay();
                    }
                }
                
                // Continue with the move
                switchPlayer();
                checkGameStatus();
                renderBoard();
                
                // Computer move if needed
                if (gameMode === 'one-player' && currentPlayer === 'black' && gameActive) {
                    setTimeout(computerMove, 500);
                }
            });
            promotionOptions.appendChild(option);
        });
    }
    
    // Update captured pieces display
    function updateCapturedPiecesDisplay() {
        whiteCapturedElement.innerHTML = '';
        blackCapturedElement.innerHTML = '';
        
        whiteCapturedPieces.forEach(p => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = getPieceUnicode(p);
            whiteCapturedElement.appendChild(pieceElement);
        });
        
        blackCapturedPieces.forEach(p => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = getPieceUnicode(p);
            blackCapturedElement.appendChild(pieceElement);
        });
    }
    
    // Switch current player
    function switchPlayer() {
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        playerColorSpan.textContent = currentPlayer === 'white' ? 'White' : 'Black';
        playerColorSpan.className = currentPlayer;
        deselectPiece();
    }
    
    // Check game status (check, checkmate, stalemate)
    function checkGameStatus() {
        const inCheck = isInCheck(currentPlayer);
        const hasLegalMoves = hasAnyLegalMoves(currentPlayer);
        
        if (inCheck) {
            if (!hasLegalMoves) {
                // Checkmate
                gameStatusElement.textContent = currentPlayer === 'white' ? 'Black wins by checkmate!' : 'White wins by checkmate!';
                gameStatusElement.className = 'checkmate';
                checkmateSound.currentTime = 0;
                checkmateSound.play();
                gameActive = false;
            } else {
                // Check
                gameStatusElement.textContent = 'Check!';
                gameStatusElement.className = 'check';
                checkSound.currentTime = 0;
                checkSound.play();
            }
        } else if (!hasLegalMoves) {
            // Stalemate
            gameStatusElement.textContent = 'Stalemate!';
            gameStatusElement.className = '';
            gameActive = false;
        } else {
            gameStatusElement.textContent = '';
            gameStatusElement.className = '';
        }
    }
    
    // Check if player is in check
    function isInCheck(color, customBoard = null) {
        const boardToCheck = customBoard || board;
        const isWhite = color === 'white';
        const kingChar = isWhite ? 'K' : 'k';
        
        // Find the king
        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (boardToCheck[r][c] === kingChar) {
                    kingPos = { row: r, col: c };
                    break;
                }
            }
            if (kingPos) break;
        }
        
        return kingPos ? isSquareUnderAttack(kingPos.row, kingPos.col, isWhite, boardToCheck) : false;
    }
    
    // Check if player has any legal moves
    function hasAnyLegalMoves(color) {
        const isWhite = color === 'white';
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece !== '' && (piece === piece.toUpperCase()) === isWhite) {
                    const moves = getValidMoves(r, c, piece);
                    if (moves.length > 0) return true;
                }
            }
        }
        
        return false;
    }
    
    // Check if player is in checkmate
    function isCheckmate(color, customBoard = null) {
        const boardToCheck = customBoard || board;
        return isInCheck(color, boardToCheck) && !hasAnyLegalMoves(color);
    }
    
    // Update timer display
    function updateTimer() {
        elapsedTime++;
        const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
        const seconds = String(elapsedTime % 60).padStart(2, '0');
        timeSpan.textContent = `${minutes}:${seconds}`;
    }
    
    // Computer AI move
    function computerMove() {
        if (!gameActive) return;
        
        const level = parseInt(levelSelect.value);
        let move;
        
        switch (level) {
            case 1: move = getRandomMove(); break;
            case 2: move = getBasicAIMove(); break;
            case 3: move = getAdvancedAIMove(); break;
            default: move = getRandomMove();
        }
        
        if (move) {
            makeMove(move);
        } else {
            // No valid moves (shouldn't happen as we check game status)
            gameStatusElement.textContent = 'Stalemate!';
            gameActive = false;
        }
    }
    
    // Level 1 AI: Random move
    function getRandomMove() {
        const allMoves = getAllValidMoves('black');
        return allMoves.length > 0 ? allMoves[Math.floor(Math.random() * allMoves.length)] : null;
    }
    
    // Level 2 AI: Basic strategy (prioritize captures)
    function getBasicAIMove() {
        const allMoves = getAllValidMoves('black');
        if (allMoves.length === 0) return null;
        
        // Find capturing moves
        const captureMoves = allMoves.filter(m => m.capture);
        if (captureMoves.length > 0) {
            // Sort by captured piece value
            captureMoves.sort((a, b) => {
                const valueA = pieceValues[board[b.toRow][b.toCol]] || 0;
                const valueB = pieceValues[board[a.toRow][a.toCol]] || 0;
                return valueA - valueB;
            });
            return captureMoves[0];
        }
        
        // No captures, return random move
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    }
    
    // Level 3 AI: Advanced strategy (evaluate board position)
    function getAdvancedAIMove() {
        const allMoves = getAllValidMoves('black');
        if (allMoves.length === 0) return null;
        
        // Evaluate each move
        const evaluatedMoves = allMoves.map(move => {
            const score = evaluateMove(move);
            return { move, score };
        });
        
        // Sort by score (highest first)
        evaluatedMoves.sort((a, b) => b.score - a.score);
        
        // Return the best move
        return evaluatedMoves[0].move;
    }
    
    // Evaluate a move for the AI
    function evaluateMove(move) {
        let score = 0;
        const tempBoard = board.map(row => [...row]);
        const captured = executeMoveOnBoard(tempBoard, move);
        
        // Material gain
        if (captured) {
            score += pieceValues[captured] * 10; // Prioritize captures
        }
        
        // Piece development
        if (move.piece.toLowerCase() === 'n' || move.piece.toLowerCase() === 'b') {
            if (move.fromRow === (move.piece === 'n' || move.piece === 'b' ? 7 : 0)) {
                score += 2; // Encourage developing knights and bishops
            }
        }
        
        // Center control
        const center = [3, 4];
        if (center.includes(move.toRow) && center.includes(move.toCol)) {
            score += 3; // Bonus for center control
        }
        
        // King safety
        if (move.piece.toLowerCase() === 'k') {
            if (move.special && move.special.includes('castling')) {
                score += 5; // Encourage castling
            }
        }
        
        // Check/checkmate potential
        if (isInCheck('white', tempBoard)) {
            score += 5; // Bonus for checks
            
            if (isCheckmate('white', tempBoard)) {
                score += 1000; // Massive bonus for checkmate
            }
        }
        
        // Avoid moving into danger
        if (isSquareUnderAttack(move.toRow, move.toCol, false, tempBoard)) {
            const pieceValue = pieceValues[move.piece] || 0;
            score -= pieceValue * 2; // Penalty for moving into attack
        }
        
        return score;
    }
    
    // Get all valid moves for a player
    function getAllValidMoves(color) {
        const isWhite = color === 'white';
        const allMoves = [];
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece !== '' && (piece === piece.toUpperCase()) === isWhite) {
                    const moves = getValidMoves(r, c, piece);
                    allMoves.push(...moves);
                }
            }
        }
        
        return allMoves;
    }
    
    // Event listeners for game controls
    newGameBtn.addEventListener('click', initGame);
    
    computerBtn.addEventListener('click', () => {
        gameMode = 'one-player';
        initGame();
    });
    
    twoPlayerBtn.addEventListener('click', () => {
        gameMode = 'two-player';
        initGame();
    });
    
    // Close promotion modal when clicking outside
    promotionModal.addEventListener('click', (e) => {
        if (e.target === promotionModal) {
            promotionModal.style.display = 'none';
        }
    });
    
    // Initialize the game
    initGame();
});