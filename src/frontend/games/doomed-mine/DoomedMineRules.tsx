import React, { useState } from 'react';
import { Pickaxe, Shield, AlertTriangle, Trophy, Layers, Sparkles, HelpCircle } from 'lucide-react';

export const DoomedMineRules: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mission' | 'phases' | 'tokens' | 'poker'>('mission');

  return (
    <div className="doomed-mine-rules-card">
      {/* Navigation Tabs */}
      <div className="rules-tabs-bar">
        <button
          type="button"
          onClick={() => setActiveTab('mission')}
          className={`btn-cel btn-sm ${activeTab === 'mission' ? 'btn-brawl-primary' : 'btn-brawl-neutral'}`}
        >
          <Pickaxe size={14} />
          <span>1. LA MISIÓN</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('phases')}
          className={`btn-cel btn-sm ${activeTab === 'phases' ? 'btn-brawl-primary' : 'btn-brawl-neutral'}`}
        >
          <Layers size={14} />
          <span>2. FASES</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tokens')}
          className={`btn-cel btn-sm ${activeTab === 'tokens' ? 'btn-brawl-primary' : 'btn-brawl-neutral'}`}
        >
          <Shield size={14} />
          <span>3. FICHAS</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('poker')}
          className={`btn-cel btn-sm ${activeTab === 'poker' ? 'btn-brawl-primary' : 'btn-brawl-neutral'}`}
        >
          <Trophy size={14} />
          <span>4. MANOS DE PÓQUER</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="rules-tab-panel">
        {activeTab === 'mission' && (
          <div className="rules-panel-content">
            <div className="ribbon-banner">OBJETIVO DE LA CUADRILLA</div>
            <h3 className="woodcut-title panel-heading">APUNTALAR 3 VIGAS ANTES DE 3 DERRUMBES</h3>

            <p className="panel-lead-text">
              Sois una cuadrilla de <strong>esqueletos mineros</strong> atrapados en las profundidades de una vieja
              mina de oro inestable. Para escapar a la superficie en la vagoneta, debéis cooperar para calibrar la tensión de la roca.
            </p>

            <div className="panel-two-cards-grid">
              <div className="cel-card panel-callout-card victory-callout">
                <div className="callout-title-row">
                  <Trophy size={18} className="gold-icon" />
                  <span className="woodcut-title">3 VIGAS ASEGURADAS</span>
                </div>
                <p>
                  Si la cuadrilla estima con total precisión el orden de fuerza en 3 expediciones, las vigas maestras soportan la presión y <strong>ganáis la partida</strong>.
                </p>
              </div>

              <div className="cel-card panel-callout-card defeat-callout">
                <div className="callout-title-row">
                  <AlertTriangle size={18} className="crimson-icon" />
                  <span className="woodcut-title">3 DERRUMBES</span>
                </div>
                <p>
                  Si alguien calcula mal la tensión y las fichas de presión contradicen la fuerza real de las manos, la galería cede. Con 3 derrumbes, <strong>la mina colapsa</strong>.
                </p>
              </div>
            </div>

            <div className="cel-card-deep panel-golden-rule">
              <div className="golden-rule-title">
                <HelpCircle size={17} />
                <span className="woodcut-title">LA REGLA DE ORO DEL SILENCIO</span>
              </div>
              <p>
                En el fondo del pozo no se habla ni se revelan las cartas. Tu <strong>única forma de comunicarte</strong> con los compañeros es la <strong>Ficha de Presión</strong> que tomas o intercambias en la mesa en cada fase.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'phases' && (
          <div className="rules-panel-content">
            <div className="ribbon-banner">ESTRUCTURA DE CADA EXPEDICIÓN</div>
            <h3 className="woodcut-title panel-heading">LAS 4 FASES DE PROSPECCIÓN (TEXAS HOLD'EM)</h3>

            <div className="phases-flow-stack">
              <div className="cel-card phase-flow-card">
                <div className="phase-num-chip">1</div>
                <div className="phase-flow-info">
                  <strong className="phase-flow-title">PRE-FLOP (EL SONDEO INICIAL)</strong>
                  <p>Cada minero recibe <strong>2 cartas secretas</strong> en su mano. Con esa información preliminar, cada uno elige una Ficha de Presión inicial (1 a N) y pulsa "Confirmar".</p>
                </div>
              </div>

              <div className="cel-card phase-flow-card">
                <div className="phase-num-chip">2</div>
                <div className="phase-flow-info">
                  <strong className="phase-flow-title">EL FLOP (3 ROCAS REVELADAS)</strong>
                  <p>Se descubren 3 cartas comunitarias en el centro. ¡Reevalúa tu jugada! Si tu mano mejoró o empeoró respecto a lo previsto, puedes <strong>cambiar de ficha</strong>.</p>
                </div>
              </div>

              <div className="cel-card phase-flow-card">
                <div className="phase-num-chip">3</div>
                <div className="phase-flow-info">
                  <strong className="phase-flow-title">EL TURN (4ª ROCA COMUNITARIA)</strong>
                  <p>Crujen los soportes con una cuarta carta visible. Se reabre la mesa para que cualquier minero pueda afinar su estimación de presión.</p>
                </div>
              </div>

              <div className="cel-card phase-flow-card">
                <div className="phase-num-chip">4</div>
                <div className="phase-flow-info">
                  <strong className="phase-flow-title">EL RIVER (5ª ROCA COMUNITARIA)</strong>
                  <p>Última roca en la mesa. Todas las cartas comunitarias están a la vista. Es la <strong>decisión definitiva</strong> antes de comprobar el resultado.</p>
                </div>
              </div>

              <div className="cel-card phase-flow-card showdown-phase-card">
                <div className="phase-num-chip showdown-chip">★</div>
                <div className="phase-flow-info">
                  <strong className="phase-flow-title">EL SHOWDOWN (EL DESPEJE)</strong>
                  <p>Se voltean todas las cartas secretas. El sistema evalúa las mejores 5 cartas de cada jugador. Si el orden de menor a mayor coincide con las fichas reclamadas, ¡la viga queda asegurada!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="rules-panel-content">
            <div className="ribbon-banner">ESTRATEGIA COOPERATIVA</div>
            <h3 className="woodcut-title panel-heading">FICHAS DE PRESIÓN Y CALIBRACIÓN</h3>

            <p className="panel-lead-text">
              En una mesa de N jugadores, hay fichas numeradas del <strong>1 al N</strong>. Cada número representa la posición relativa de tu mano al final de la ronda:
            </p>

            <div className="tokens-guide-grid">
              <div className="cel-card token-guide-item">
                <div className="token-guide-chip chip-low">1</div>
                <div>
                  <strong className="woodcut-title">FICHA 1 (MÍNIMA TENSIÓN)</strong>
                  <p>Para la mano más débil de la cuadrilla (ej. carta alta o pareja baja descolgada).</p>
                </div>
              </div>

              <div className="cel-card token-guide-item">
                <div className="token-guide-chip chip-mid">2 ... N-1</div>
                <div>
                  <strong className="woodcut-title">FICHAS INTERMEDIAS</strong>
                  <p>Para combinaciones moderadas (parejas altas, dobles parejas, proyectos fuertes).</p>
                </div>
              </div>

              <div className="cel-card token-guide-item">
                <div className="token-guide-chip chip-high">N</div>
                <div>
                  <strong className="woodcut-title">FICHA N (MÁXIMA TENSIÓN)</strong>
                  <p>Reservada para la jugada más poderosa del equipo (tríos, colores, escaleras o full house).</p>
                </div>
              </div>
            </div>

            <div className="cel-card-deep panel-hint-box">
              <Sparkles size={16} className="gold-icon" />
              <span>
                <strong>Consejo de veterano:</strong> Si tienes una ficha y otro compañero la necesita porque su mano es más adecuada, puedes pulsar otra ficha disponible para liberar la tuya al instante.
              </span>
            </div>
          </div>
        )}

        {activeTab === 'poker' && (
          <div className="rules-panel-content">
            <div className="ribbon-banner">TABLA OFICIAL DE TEXAS HOLD'EM</div>
            <h3 className="woodcut-title panel-heading">JERARQUÍA DE MANOS (DE MENOR A MAYOR)</h3>

            <div className="poker-hierarchy-table">
              {[
                { rank: 1, name: '1. Carta Alta', example: 'A ♦ 10 ♠ 8 ♣ 6 ♥ 2 ♦', desc: 'Sin combinaciones; gana la carta individual de mayor valor.' },
                { rank: 2, name: '2. Pareja', example: 'J ♠ J ♥ 9 ♣ 5 ♦ 2 ♠', desc: 'Dos cartas del mismo rango.' },
                { rank: 3, name: '3. Doble Pareja', example: 'K ♠ K ♦ 7 ♣ 7 ♥ 4 ♠', desc: 'Dos parejas distintas.' },
                { rank: 4, name: '4. Trío', example: '8 ♠ 8 ♥ 8 ♦ K ♣ 3 ♠', desc: 'Tres cartas del mismo rango.' },
                { rank: 5, name: '5. Escalera', example: '5 ♠ 6 ♦ 7 ♣ 8 ♥ 9 ♠', desc: 'Cinco cartas correlativas de distinto palo.' },
                { rank: 6, name: '6. Color (Flush)', example: 'K ♠ J ♠ 8 ♠ 6 ♠ 2 ♠', desc: 'Cinco cartas del mismo palo.' },
                { rank: 7, name: '7. Full House', example: 'Q ♠ Q ♥ Q ♦ 10 ♣ 10 ♠', desc: 'Un trío junto a una pareja.' },
                { rank: 8, name: '8. Póquer', example: '4 ♠ 4 ♥ 4 ♦ 4 ♣ A ♠', desc: 'Cuatro cartas del mismo rango.' },
                { rank: 9, name: '9. Escalera de Color', example: '6 ♥ 7 ♥ 8 ♥ 9 ♥ 10 ♥', desc: 'Cinco cartas correlativas del mismo palo.' },
                { rank: 10, name: '10. Escalera Real', example: '10 ♠ J ♠ Q ♠ K ♠ A ♠', desc: 'La mejor mano posible del póquer: 10 al As del mismo palo.' },
              ].map((item) => (
                <div key={item.rank} className="poker-hand-row cel-card">
                  <div className="poker-rank-tag">{item.rank}</div>
                  <div className="poker-hand-details">
                    <strong className="woodcut-title poker-hand-title">{item.name}</strong>
                    <span className="poker-hand-desc">{item.desc}</span>
                  </div>
                  <div className="poker-example-stub ticket-stub">
                    <span className="ticket-stub-code">{item.example}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .doomed-mine-rules-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          user-select: none;
        }
        .rules-tabs-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          border-bottom: var(--border-ink-thin);
          padding-bottom: 12px;
        }
        .rules-panel-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .panel-heading {
          font-size: 20px;
          color: var(--color-text-main);
          letter-spacing: 0.02em;
        }
        .panel-lead-text {
          font-family: var(--font-body);
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-text-lead);
        }
        .panel-two-cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 640px) {
          .panel-two-cards-grid {
            grid-template-columns: 1fr;
          }
        }
        .panel-callout-card {
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .victory-callout {
          border-left: 5px solid var(--color-golden-buttercup);
        }
        .defeat-callout {
          border-left: 5px solid var(--color-cuphead-red);
        }
        .callout-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        .panel-callout-card p {
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--color-text-lead);
          margin: 0;
          line-height: 1.4;
        }
        .panel-golden-rule {
          padding: 12px 14px;
          border-radius: var(--radius-cel-box);
          border: var(--border-ink-standard);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .golden-rule-title {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--color-cuphead-red);
          font-size: 14px;
        }
        .panel-golden-rule p {
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--color-text-main);
          margin: 0;
          line-height: 1.4;
        }
        .gold-icon { color: var(--color-golden-buttercup); }
        .crimson-icon { color: var(--color-cuphead-red); }

        /* Phases Flow */
        .phases-flow-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .phase-flow-card {
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .phase-num-chip {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background-color: var(--color-golden-buttercup);
          color: var(--color-ink-black);
          border: var(--border-ink-standard);
          box-shadow: var(--shadow-cel-sm);
          font-family: var(--font-heading);
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .showdown-phase-card {
          border-left: 5px solid var(--color-cuphead-red);
        }
        .showdown-chip {
          background-color: var(--color-cuphead-red);
          color: #ffffff;
        }
        .phase-flow-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .phase-flow-title {
          font-family: var(--font-heading);
          font-size: 14px;
          color: var(--color-text-main);
        }
        .phase-flow-info p {
          font-family: var(--font-body);
          font-size: 12.5px;
          color: var(--color-text-lead);
          margin: 0;
          line-height: 1.35;
        }

        /* Tokens Guide */
        .tokens-guide-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }
        .token-guide-item {
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .token-guide-chip {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: var(--border-ink-standard);
          box-shadow: var(--shadow-cel-sm);
          font-family: var(--font-heading);
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .chip-low { background-color: var(--color-mugman-cyan); color: #fff; }
        .chip-mid { background-color: var(--color-golden-buttercup); color: #1c1511; }
        .chip-high { background-color: var(--color-cuphead-red); color: #fff; }
        .token-guide-item p {
          font-family: var(--font-body);
          font-size: 12px;
          color: var(--color-text-lead);
          margin: 2px 0 0 0;
        }
        .panel-hint-box {
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--color-text-main);
        }

        /* Poker Hierarchy */
        .poker-hierarchy-table {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .poker-hand-row {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .poker-rank-tag {
          font-family: var(--font-heading);
          font-size: 14px;
          color: var(--color-cuphead-red);
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }
        .poker-hand-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .poker-hand-title {
          font-size: 13.5px;
          color: var(--color-text-main);
        }
        .poker-hand-desc {
          font-family: var(--font-body);
          font-size: 11.5px;
          color: var(--color-text-lead);
        }
        .poker-example-stub {
          flex-shrink: 0;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};
