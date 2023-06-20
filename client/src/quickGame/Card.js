import React, { useState, useEffect } from 'react';

export function Card({ card, playOrInvest, currentPlayer }) {
    const [investment, setInvestment] = useState(0);
  
    const handlePlay = () => {
      playOrInvest(card.title, 'play');
    };
  
    const handleInvest = () => {
      playOrInvest(card.title, 'invest', parseInt(investment));
    };
  
    const handleInvestmentChange = (event) => {
      setInvestment(event.target.value);
    };
  
    const availableResource = (card.currency === "data") ? currentPlayer.data : currentPlayer.processingPower;
    let isInvestmentValid = false;
  
    if (card.price === 'variable') {
      if (investment > 0 && availableResource >= investment) {
        isInvestmentValid = true;
      }
    } else {
      if (card.price <= availableResource) {
        isInvestmentValid = true;
      }
    }
  
    return (
      <div className="card" >
        <h2>{card.title}</h2>
        <p>{card.description}</p>
        <div  className='buy'>
          <h3>Play Effect</h3>
          <button onClick={handlePlay}>Play</button>
        </div>
        <div className='invest' >
          <h3>Invest Effect, COST: {card.price === "variable" ? "X" : card.price} {card.currency} </h3>
          {card.price === 'variable' && (
            <input type="number" value={investment} onChange={handleInvestmentChange} />
          )}
          <button onClick={handleInvest} disabled={!isInvestmentValid}>
            Invest
          </button>
        </div>
      </div>
    );
  }
  