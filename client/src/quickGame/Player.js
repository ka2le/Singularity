

export function Player({ player }) {
    return (
      <div className="player">
        <h2>{player.name}</h2>
        <p>Score: {player.score}</p>
        <p>Data: {player.data}</p>
        <p>Processing Power: {player.processingPower}</p>
      </div>
    );
  }