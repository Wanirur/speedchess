/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { type PlayerColor } from "@prisma/client";
import { Coords } from "~/utils/coords";
import { type Board } from "~/utils/pieces";
import type ChessPosition from "./position";

export type KingCheck = {
  attackingPieceCoords: Coords;
  possibleBlocks: Coords[];
  cannotEscapeTo: Coords[];
};

export type Pin = {
  pinnedPiece: Coords;
  possibleMoves: Coords[];
};

export type PieceInteractions = {
  possibleMoves: Coords[];
  attackedTiles: Coords[];
  possibleCaptures: Coords[];
  defendedPieces: Coords[];
  kingChecks: KingCheck[];
  pins: Pin[];
};

export class PieceAttacks {
  public static calculateAttackedTiles(position: ChessPosition) {
    const board = position.board;
    const whiteKingCoords = position.whiteKingCoords;
    const blackKingCoords = position.blackKingCoords;

    let x = 0,
      y = 0;

    let whitePieceInteractions: PieceInteractions = {
        possibleMoves: [],
        attackedTiles: [],
        possibleCaptures: [],
        defendedPieces: [],
        kingChecks: [],
        pins: [],
      },
      blackPieceInteractions: PieceInteractions = {
        possibleMoves: [],
        attackedTiles: [],
        possibleCaptures: [],
        defendedPieces: [],
        kingChecks: [],
        pins: [],
      };

    const attacksWhiteSet = new Set<Coords>();
    const attacksBlackSet = new Set<Coords>();
    const movesWhiteSet = new Set<Coords>();
    const movesBlackSet = new Set<Coords>();
    const defensesWhiteSet = new Set<Coords>();
    const defensesBlackSet = new Set<Coords>();
    const capturesWhiteSet = new Set<Coords>();
    const capturesBlackSet = new Set<Coords>();
    const checksWhiteSet = new Set<KingCheck>();
    const checksBlackSet = new Set<KingCheck>();
    const pinsByWhite = new Set<Pin>();
    const pinsByBlack = new Set<Pin>();

    for (const row of board) {
      for (const tile of row) {
        if (tile === null) {
          x++;
          continue;
        }
        const pieceCoords = Coords.getInstance(x, y);
        if (!pieceCoords) {
          x++;
          continue;
        }
        if (tile.pieceType === "KING") {
          x++;
          continue;
        }

        let pinsFromLastTurn: Pin[],
          moves: Set<Coords>,
          attacks: Set<Coords>,
          captures: Set<Coords>,
          defenses: Set<Coords>,
          checks: Set<KingCheck>,
          pins: Set<Pin>;

        if (tile.color === "WHITE") {
          pinsFromLastTurn = whitePieceInteractions.pins;
          moves = movesWhiteSet;
          attacks = attacksWhiteSet;
          captures = capturesWhiteSet;
          defenses = defensesWhiteSet;
          checks = checksWhiteSet;
          pins = pinsByWhite;
        } else {
          pinsFromLastTurn = blackPieceInteractions.pins;
          moves = movesBlackSet;
          attacks = attacksBlackSet;
          captures = capturesBlackSet;
          defenses = defensesBlackSet;
          checks = checksBlackSet;
          pins = pinsByBlack;
        }

        const possibleAttacks = this.getPossibleMoves(position, pieceCoords);

        possibleAttacks.possibleMoves.forEach((possibleMove) => {
          const pin = pinsFromLastTurn.find(
            (pin) => pin.pinnedPiece === pieceCoords
          );
          if (pin && !pin.possibleMoves.includes(possibleMove)) {
            return;
          }

          moves.add(possibleMove);
        });

        possibleAttacks.attackedTiles.forEach((possibleAttack) => {
          const pin = pinsFromLastTurn.find(
            (pin) => pin.pinnedPiece === pieceCoords
          );
          if (pin && !pin.possibleMoves.includes(possibleAttack)) {
            return;
          }

          attacks.add(possibleAttack);
        });

        possibleAttacks.defendedPieces.forEach((defendedPiece) => {
          const pin = pinsFromLastTurn.find(
            (pin) => pin.pinnedPiece === pieceCoords
          );
          if (pin && !pin.possibleMoves.includes(defendedPiece)) {
            return;
          }

          defenses.add(defendedPiece);
        });
        possibleAttacks.possibleCaptures.forEach((possibleCapture) => {
          const pin = pinsFromLastTurn.find(
            (pin) => pin.pinnedPiece === pieceCoords
          );
          if (pin && !pin.possibleMoves.includes(possibleCapture)) {
            return;
          }

          captures.add(possibleCapture);
        });

        if (possibleAttacks.kingChecks) {
          possibleAttacks.kingChecks.forEach((check) => {
            checks.add(check);
          });
        }

        const currentPiecePins = possibleAttacks.pins;
        currentPiecePins.forEach((pin) => {
          pins.add(pin);
        });
        x++;
      }
      x = 0;
      y++;
    }

    whitePieceInteractions = {
      attackedTiles: Array.from(attacksWhiteSet),
      possibleMoves: Array.from(movesWhiteSet),
      possibleCaptures: Array.from(capturesWhiteSet),
      defendedPieces: Array.from(defensesWhiteSet),
      kingChecks: Array.from(checksWhiteSet),
      pins: Array.from(pinsByWhite),
    };

    blackPieceInteractions = {
      attackedTiles: Array.from(attacksBlackSet),
      possibleMoves: Array.from(movesBlackSet),
      possibleCaptures: Array.from(capturesBlackSet),
      defendedPieces: Array.from(defensesBlackSet),
      kingChecks: Array.from(checksBlackSet),
      pins: Array.from(pinsByBlack),
    };

    const whiteKingInteractions = this.getPossibleMoves(
      position,
      whiteKingCoords
    );

    const blackKingInteractions = this.getPossibleMoves(
      position,
      blackKingCoords
    );

    return {
      white: whitePieceInteractions,
      whiteKing: whiteKingInteractions,
      black: blackPieceInteractions,
      blackKing: blackKingInteractions,
    };
  }

  public static getPossibleMoves(
    position: ChessPosition,
    coords: Coords
  ): PieceInteractions {
    const emptyMoves = {
      possibleMoves: [] as Coords[],
      attackedTiles: [] as Coords[],
      possibleCaptures: [] as Coords[],
      defendedPieces: [] as Coords[],
      kingChecks: [],
      pins: [],
    };

    const board = position.board;

    const piece = board[coords.y]?.[coords.x];
    if (!piece) {
      return emptyMoves;
    }

    if (piece.pieceType === "ROOK") {
      return this._getPossibleRookMoves(board, coords, piece.color);
    }
    if (piece.pieceType === "PAWN") {
      return this._getPossiblePawnMoves(
        board,
        position.movedPawns,
        position.pawnPossibleToEnPassant,
        coords,
        piece.color
      );
    }
    if (piece.pieceType === "BISHOP") {
      return this._getPossibleBishopMoves(board, coords, piece.color);
    }
    if (piece.pieceType === "QUEEN") {
      return this._getPossibleQueenMoves(board, coords, piece.color);
    }
    if (piece.pieceType === "KING") {
      let interactions,
        kingInteractions,
        isShortCastlingAllowed,
        isLongCastlingAllowed;

      if (piece.color === "WHITE") {
        interactions = position.blackPieceInteractions;
        kingInteractions = position.blackKingInteractions;
        isShortCastlingAllowed = position.isWhiteShortCastlingPossible;
        isLongCastlingAllowed = position.isWhiteLongCastlingPossible;
      } else {
        interactions = position.whitePieceInteractions;
        kingInteractions = position.whiteKingInteractions;
        isShortCastlingAllowed = position.isBlackShortCastlingPossible;
        isLongCastlingAllowed = position.isBlackLongCastlingPossible;
      }

      return this._getPossibleKingMoves(
        board,
        interactions,
        kingInteractions,
        isShortCastlingAllowed,
        isLongCastlingAllowed,
        coords,
        piece.color
      );
    }
    if (piece.pieceType === "KNIGHT") {
      return this._getPossibleKnightMoves(board, coords, piece.color);
    }

    return emptyMoves;
  }

  private static _getPossibleRookMoves(
    board: Board,
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    const checkLine = (xStep: number, yStep: number) => {
      const possibleMoves = [] as Coords[];
      const possibleCaptures = [] as Coords[];
      const defendedTiles = [] as Coords[];
      let kingCheck: KingCheck | undefined = undefined;
      let pin: Pin | undefined = undefined;
      let hasPinOccured = false;

      for (let i = 1; i < 8; i++) {
        const currentCoords = Coords.getInstance(
          position.x + xStep * i,
          position.y + yStep * i
        );
        if (!currentCoords) {
          break;
        }

        const tile = board[currentCoords.y]?.[currentCoords.x];
        if (tile === undefined) {
          throw new Error("broken board");
        }

        if (tile === null) {
          if (pin) {
            pin.possibleMoves.push(currentCoords);
          } else {
            possibleMoves.push(currentCoords);
          }

          continue;
        }

        if (!pin) {
          if (tile.color === color) {
            defendedTiles.push(currentCoords);
            break;
          }

          possibleCaptures.push(currentCoords);
          if (tile.pieceType !== "KING") {
            pin = {
              pinnedPiece: currentCoords,
              possibleMoves: [...possibleMoves],
            };
          }
        }

        if (tile.pieceType === "KING") {
          if (pin) {
            hasPinOccured = true;
          } else {
            kingCheck = {
              attackingPieceCoords: position,
              possibleBlocks: [...possibleMoves],
              cannotEscapeTo: [],
            };
            if (xStep === 0) {
              let temp = Coords.getInstance(
                currentCoords.x,
                currentCoords.y - 1
              );
              if (temp) {
                kingCheck.cannotEscapeTo.push(temp);
              }
              temp = Coords.getInstance(currentCoords.x, currentCoords.y + 1);
              if (temp) {
                kingCheck.cannotEscapeTo.push(temp);
              }
            } else {
              let temp = Coords.getInstance(
                currentCoords.x - 1,
                currentCoords.y
              );
              if (temp) {
                kingCheck.cannotEscapeTo.push(temp);
              }
              temp = Coords.getInstance(currentCoords.x + 1, currentCoords.y);
              if (temp) {
                kingCheck.cannotEscapeTo.push(temp);
              }
            }
          }

          break;
        }
      }

      return {
        possibleMoves: possibleMoves,
        possibleCaptures: possibleCaptures,
        defendedPieces: defendedTiles,
        kingCheck: kingCheck,
        pin: hasPinOccured ? pin : undefined,
      };
    };

    const left = checkLine(-1, 0);
    const right = checkLine(1, 0);
    const down = checkLine(0, -1);
    const up = checkLine(0, 1);

    const possibleMoves = [
      ...left.possibleMoves,
      ...right.possibleMoves,
      ...down.possibleMoves,
      ...up.possibleMoves,
    ];
    const possibleCaptures = [
      ...left.possibleCaptures,
      ...right.possibleCaptures,
      ...down.possibleCaptures,
      ...up.possibleCaptures,
    ];
    const defendedPieces = [
      ...left.defendedPieces,
      ...right.defendedPieces,
      ...down.defendedPieces,
      ...up.defendedPieces,
    ];

    let kingCheck: KingCheck | undefined = undefined;
    if (left.kingCheck) {
      kingCheck = left.kingCheck;
    } else if (right.kingCheck) {
      kingCheck = right.kingCheck;
    } else if (down.kingCheck) {
      kingCheck = down.kingCheck;
    } else if (up.kingCheck) {
      kingCheck = up.kingCheck;
    }

    let pin: Pin | undefined = undefined;
    if (left.pin) {
      pin = left.pin;
    } else if (right.pin) {
      pin = right.pin;
    } else if (down.pin) {
      pin = down.pin;
    } else if (up.pin) {
      pin = up.pin;
    }

    return {
      possibleMoves: possibleMoves,
      attackedTiles: [...possibleMoves],
      possibleCaptures: possibleCaptures,
      defendedPieces: defendedPieces,
      kingChecks: kingCheck ? [kingCheck] : [],
      pins: pin ? [pin] : [],
    };
  }

  private static _getPossiblePawnMoves(
    board: Board,
    movedPawns: Set<Coords>,
    possibleToEnPassant: Coords | undefined,
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    let coords;
    let canMoveOneTile = false;

    const attacks = this._getPossiblePawnAttacks(
      board,
      possibleToEnPassant,
      position,
      color
    );
    const possibleMoves = [] as Coords[];
    const toReturn = {
      possibleMoves: possibleMoves,
      attackedTiles: attacks.attackedTiles,
      possibleCaptures: attacks.possibleCaptures,
      defendedPieces: attacks.defendedPieces,
      kingChecks: attacks.kingChecks,
      pins: [],
    };
    if (color === "WHITE") {
      coords = Coords.getInstance(position.x, position.y + 1);
    } else {
      coords = Coords.getInstance(position.x, position.y - 1);
    }

    if (!coords) {
      return toReturn;
    }

    const tile = board[coords.y]?.[coords.x];
    if (tile === undefined) {
      throw new Error("broken board");
    }

    if (tile === null) {
      possibleMoves.push(coords);
      canMoveOneTile = true;
    }

    if (movedPawns.has(position)) {
      return toReturn;
    }

    if (color === "WHITE") {
      coords = Coords.getInstance(position.x, position.y + 2);
    } else {
      coords = Coords.getInstance(position.x, position.y - 2);
    }

    if (coords && canMoveOneTile && tile === null) {
      possibleMoves.push(coords);
    }

    return toReturn;
  }

  private static _getPossiblePawnAttacks(
    board: Board,
    possibleToEnPassant: Coords | undefined,
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    const getCaptures = (xDiff: number): PieceInteractions => {
      const possibleCaptures = [] as Coords[];
      const defendedPieces = [] as Coords[];
      const possibleMoves = [] as Coords[];
      const attackedTiles = [] as Coords[];
      const kingChecks: KingCheck[] = [];
      const toReturn = {
        possibleMoves: possibleMoves,
        attackedTiles: attackedTiles,
        possibleCaptures: possibleCaptures,
        defendedPieces: defendedPieces,
        kingChecks: kingChecks,
        pins: [],
      };
      let coords;
      if (color === "WHITE") {
        coords = Coords.getInstance(position.x + xDiff, position.y + 1);
      } else {
        coords = Coords.getInstance(position.x + xDiff, position.y - 1);
      }
      if (!coords) {
        return toReturn;
      }

      const tile = board[coords.y]?.[coords.x];
      if (tile === undefined) {
        throw new Error("broken board");
      }

      if (tile === null) {
        attackedTiles.push(coords);
        const enPassantCoords = Coords.getInstance(coords.x, position.y);
        if (!enPassantCoords) {
          return toReturn;
        }

        const tilePossibleToEnPassant =
          board[enPassantCoords.y]?.[enPassantCoords.x];
        if (tilePossibleToEnPassant === undefined) {
          throw new Error("broken board");
        }

        if (tilePossibleToEnPassant === null) {
          return toReturn;
        }

        if (
          possibleToEnPassant === enPassantCoords &&
          tilePossibleToEnPassant.pieceType === "PAWN" &&
          tilePossibleToEnPassant.color !== color
        ) {
          possibleCaptures.push(coords);
        }
        return toReturn;
      }
      if (tile.color !== color) {
        if (tile.pieceType === "KING") {
          kingChecks.push({
            attackingPieceCoords: position,
            possibleBlocks: [] as Coords[],
            cannotEscapeTo: [],
          });
        }
        possibleCaptures.push(coords);
      } else {
        defendedPieces.push(coords);
      }

      return toReturn;
    };

    const leftCaptures = getCaptures(-1);
    const rightCaptures = getCaptures(1);
    const kingChecks = [
      ...leftCaptures.kingChecks,
      ...rightCaptures.kingChecks,
    ];

    const attackedTiles = [] as Coords[];
    if (leftCaptures.attackedTiles) {
      attackedTiles.concat(leftCaptures.attackedTiles);
    }
    if (rightCaptures.attackedTiles) {
      attackedTiles.concat(rightCaptures.attackedTiles);
    }

    return {
      possibleMoves: [] as Coords[],
      attackedTiles: attackedTiles,
      possibleCaptures: [
        ...leftCaptures.possibleCaptures,
        ...rightCaptures.possibleCaptures,
      ],
      defendedPieces: [
        ...leftCaptures.defendedPieces,
        ...rightCaptures.defendedPieces,
      ],
      kingChecks: kingChecks,
      pins: [],
    };
  }

  private static _getPossibleBishopMoves(
    board: Board,
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    const possibleMoves = [[], [], [], []] as Coords[][];
    const possibleCaptures = [[], [], [], []] as Coords[][];
    const defendedPieces = [[], [], [], []] as Coords[][];
    let kingCheck: KingCheck | undefined = undefined;
    const potentialPins = [] as Pin[];
    let hasPinOccured = false;
    const isDiagonalPotentialPin = [false, false, false, false];
    const isDiagonalBlocked = [false, false, false, false];

    for (let i = 1; i < 8; i++) {
      const currentCoords = [
        Coords.getInstance(position.x + i, position.y + i),
        Coords.getInstance(position.x + i, position.y - i),
        Coords.getInstance(position.x - i, position.y - i),
        Coords.getInstance(position.x - i, position.y + i),
      ];
      currentCoords.forEach((coords, index) => {
        if (!coords || isDiagonalBlocked[index]) {
          return;
        }

        const tile = board[coords.y]?.[coords.x];
        if (tile === undefined) {
          throw new Error("broken board");
        }

        if (tile === null) {
          if (isDiagonalPotentialPin[index]) {
            potentialPins[index]?.possibleMoves.push(coords);
          } else {
            possibleMoves[index]?.push(coords);
          }

          return;
        }

        if (tile.color === color) {
          defendedPieces[index]?.push(coords);
          isDiagonalBlocked[index] = true;
          return;
        }

        if (isDiagonalPotentialPin[index]) {
          if (tile.pieceType === "KING") {
            hasPinOccured = true;
          } else {
            isDiagonalPotentialPin[index] = false;
            isDiagonalBlocked[index] = true;
          }

          return;
        }

        if (tile.pieceType === "KING") {
          isDiagonalBlocked[index] = true;
          kingCheck = {
            attackingPieceCoords: position,
            possibleBlocks: possibleMoves[index]!,
            cannotEscapeTo: [],
          };

          if (index === 0 || index === 2) {
            let coords = Coords.getInstance(
              currentCoords[index]!.x - 1,
              currentCoords[index]!.y - 1
            );
            if (coords) {
              kingCheck.cannotEscapeTo.push(coords);
            }
            coords = Coords.getInstance(
              currentCoords[index]!.x + 1,
              currentCoords[index]!.y + 1
            );
          } else {
            let coords = Coords.getInstance(
              currentCoords[index]!.x + 1,
              currentCoords[index]!.y - 1
            );
            if (coords) {
              kingCheck.cannotEscapeTo.push(coords);
            }
            coords = Coords.getInstance(
              currentCoords[index]!.x - 1,
              currentCoords[index]!.y + 1
            );
          }
        } else {
          possibleCaptures[index]!.push(coords);
          isDiagonalPotentialPin[index] = true;
          potentialPins[index] = {
            pinnedPiece: coords,
            possibleMoves: [...possibleMoves[index]!],
          };
        }
      });
    }

    const pinDiagonalIndex = hasPinOccured
      ? isDiagonalPotentialPin.findIndex((pinOccured) => pinOccured)
      : undefined;

    const pin = pinDiagonalIndex ? potentialPins[pinDiagonalIndex] : undefined;
    const possibleMovesMerged = possibleMoves.reduce((prev, cur) =>
      prev.concat(cur)
    );
    return {
      possibleMoves: possibleMovesMerged,
      attackedTiles: [...possibleMovesMerged],
      possibleCaptures: possibleCaptures.reduce((prev, cur) =>
        prev.concat(cur)
      ),
      defendedPieces: defendedPieces.reduce((prev, cur) => prev.concat(cur)),
      pins: pin ? [pin] : [],
      kingChecks: kingCheck ? [kingCheck] : [],
    };
  }

  private static _getPossibleQueenMoves(
    board: Board,
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    const rookResult = this._getPossibleRookMoves(board, position, color);
    const bishopResult = this._getPossibleBishopMoves(board, position, color);

    const possibleMoves = [
      ...bishopResult.possibleMoves,
      ...rookResult.possibleMoves,
    ];

    return {
      possibleMoves: possibleMoves,
      attackedTiles: [...possibleMoves],
      possibleCaptures: [
        ...bishopResult.possibleCaptures,
        ...rookResult.possibleCaptures,
      ],
      defendedPieces: [
        ...bishopResult.defendedPieces,
        ...rookResult.defendedPieces,
      ],
      pins: [...bishopResult.pins, ...rookResult.pins],
      kingChecks: [...bishopResult.kingChecks, ...rookResult.kingChecks],
    };
  }

  private static _getPossibleKnightMoves(
    board: Board,
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    const possibleMoves = [] as Coords[];
    const defendedPieces = [] as Coords[];
    const possibleCaptures = [] as Coords[];
    const kingChecks: KingCheck[] = [];

    const xDiff = [1, 1, -1, -1, 2, 2, -2, -2];
    const yDiff = [2, -2, 2, -2, 1, -1, 1, -1];
    for (let i = 0; i < 8; i++) {
      const coords = Coords.getInstance(
        position.x + xDiff[i]!,
        position.y + yDiff[i]!
      );
      if (!coords) {
        continue;
      }

      const tile = board[coords.y]?.[coords.x];
      if (tile === undefined) {
        throw new Error("broken board");
      }

      if (tile === null) {
        possibleMoves.push(coords);
        continue;
      }

      if (tile.color === color) {
        defendedPieces.push(coords);
        continue;
      }

      possibleCaptures.push(coords);
      if (tile.pieceType == "KING") {
        kingChecks.push({
          attackingPieceCoords: position,
          possibleBlocks: [] as Coords[],
          cannotEscapeTo: [],
        });
      }
    }

    return {
      possibleMoves: possibleMoves,
      attackedTiles: [...possibleMoves],
      possibleCaptures: possibleCaptures,
      defendedPieces: defendedPieces,
      kingChecks: kingChecks,
      pins: [],
    };
  }

  private static _getPossibleKingMoves(
    board: Board,
    interactions: PieceInteractions,
    kingInteractions: PieceInteractions,
    isShortCastlingAllowed: boolean,
    isLongCastlingAllowed: boolean,
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    let possibleMoves = [] as Coords[];
    const defendedPieces = [] as Coords[];
    let possibleCaptures = [] as Coords[];

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) {
          continue;
        }

        const coords = Coords.getInstance(position.x + i, position.y + j);
        if (!coords) {
          continue;
        }
        const tile = board[coords.y]?.[coords.x];
        if (tile === undefined) {
          throw new Error("broken board");
        }

        if (tile === null) {
          const isTileAttacked =
            interactions.attackedTiles.includes(coords) ||
            kingInteractions.attackedTiles.includes(coords);

          if (!isTileAttacked) {
            possibleMoves.push(coords);
          }
          continue;
        }

        if (tile.color === color) {
          defendedPieces.push(coords);
          continue;
        }

        const isPieceDefended =
          interactions.defendedPieces.includes(coords) ||
          kingInteractions.defendedPieces.includes(coords);

        if (!isPieceDefended) {
          possibleCaptures.push(coords);
        }
      }
    }

    const isChecked = !!interactions.kingChecks.length;

    if (isChecked) {
      interactions.kingChecks.forEach((check) => {
        possibleMoves = possibleMoves.filter(
          (move) => !check.cannotEscapeTo.includes(move)
        );

        possibleCaptures = possibleCaptures.filter(
          (capture) =>
            !check.cannotEscapeTo.includes(capture) ||
            check.attackingPieceCoords === capture
        );
      });
    }

    //short castling
    if (isShortCastlingAllowed && !isChecked) {
      //hardcoded coords cannot be undefined so non-null assertion allowed
      const rookCoordsAfterCastling =
        color === "WHITE"
          ? Coords.getInstance(5, 0)!
          : Coords.getInstance(5, 7)!;

      const kingCoordsAfterCastling =
        color === "WHITE"
          ? Coords.getInstance(6, 0)!
          : Coords.getInstance(6, 7)!;

      const rookTileAfterCastling =
        board[rookCoordsAfterCastling.y]?.[rookCoordsAfterCastling.x];
      const kingTileAfterCastling =
        board[kingCoordsAfterCastling.y]?.[kingCoordsAfterCastling.x];

      if (
        rookTileAfterCastling === undefined ||
        kingTileAfterCastling === undefined
      ) {
        throw new Error("broken board");
      }

      if (
        rookTileAfterCastling === null &&
        !interactions.attackedTiles.includes(rookCoordsAfterCastling) &&
        kingTileAfterCastling === null &&
        !interactions.attackedTiles.includes(kingCoordsAfterCastling)
      ) {
        possibleMoves.push(kingCoordsAfterCastling);
      }
    }
    //long castling
    if (color === "WHITE" && isLongCastlingAllowed && !isChecked) {
      //hardcoded coords cannot be undefined so non-null assertion allowed
      const rookCoordsAfterCastling =
        color === "WHITE"
          ? Coords.getInstance(3, 0)!
          : Coords.getInstance(3, 7)!;
      const kingCoordsAfterCastling =
        color === "WHITE"
          ? Coords.getInstance(2, 0)!
          : Coords.getInstance(2, 7)!;

      const rookTileAfterCastling =
        board[rookCoordsAfterCastling.y]?.[rookCoordsAfterCastling.x];
      const kingTileAfterCastling =
        board[kingCoordsAfterCastling.y]?.[kingCoordsAfterCastling.x];

      if (
        rookTileAfterCastling === undefined ||
        kingTileAfterCastling === undefined
      ) {
        throw new Error("broken board");
      }

      if (
        rookTileAfterCastling === null &&
        !interactions.attackedTiles.includes(rookCoordsAfterCastling) &&
        kingTileAfterCastling === null &&
        !interactions.attackedTiles.includes(kingCoordsAfterCastling)
      ) {
        possibleMoves.push(kingCoordsAfterCastling);
      }
    }

    return {
      possibleMoves: possibleMoves,
      attackedTiles: [...possibleMoves],
      possibleCaptures: possibleCaptures,
      defendedPieces: defendedPieces,
      kingChecks: [],
      pins: [],
    };
  }
}
