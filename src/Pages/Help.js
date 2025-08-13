import React, { useState } from "react";
import { Container, Row, Col, Accordion } from "react-bootstrap";
import { LifeBuoy, Scale } from "lucide-react"; // Added icons
import MainLayout from "../Components/MainLayout";

const Help = () => {
  const [activeTab, setActiveTab] = useState("faqs");

  const tabs = [
    { id: "faqs", label: "FAQs" },
    { id: "support", label: "Support" },
    { id: "siterules", label: "Site Rules" },
    { id: "disputes", label: "Disputes" },
  ];

  const faqs = [
    {
      category: "General",
      items: [
        { q: "What is NoctaZone?", a: "NoctaZone is an online gaming competition platform where players compete for cash prizes." },
        { q: "Is NoctaZone free to join?", a: "Yes! Signing up is completely free. You only pay when entering paid tournaments or matches." }
      ]
    },
    {
      category: "Deposits",
      items: [
        { q: "How do I deposit?", a: "Go to the Wallet section, choose your payment method, and follow the instructions." },
        { q: "Is there a deposit fee?", a: "No, NoctaZone does not charge fees for deposits, but your bank may have its own charges." }
      ]
    },
    {
      category: "Matches",
      items: [
        { q: "How do I join a match?", a: "Browse active matches in the Matches section, then click 'Join' on the one you want to enter." },
        { q: "Can I cancel a match?", a: "Once joined, cancellation is not allowed unless the match creator agrees." }
      ]
    }
  ];

  const siteRules = [
    {
      title: "Reporting Results and Cancellations",
      content: `From the moment the first member reports the results of the match, the other participant has 30 minutes to Verify or Dispute the match report. If the results are not Verified or Disputed, the system will automatically Verify the report 30 minutes after it is made.

Should a match go unreported within 75 minutes of it being accepted, it will be considered null and void. It will not be reflected on the players profiles and the funds will be returned to the user's account. If you Cancel a match or a match is canceled, it is final. Once a match is wiped, it cannot be brought back up.`
    },
    {
      title: "General Site Rules",
      content: `It is the responsibility of the NoctaZone.com member to read and fully understand these rules and policies before participating in any tournaments. These rules apply to all matches.

Any rule not stated in the pregame rules will be considered invalid and not an enforceable rule for the match. All agreed upon rules apply to both parties unless the agreed upon rules specifically state otherwise. Any rule that does not pertain to game play for the match that is set up is not an enforceable rule.

Glitches or actions that manipulate the basic functions of the game itself are enforceable whether the action or glitch is specified in the agreed upon rules as disallowed or not.

Custom rosters and custom players are not allowed. If you customize your rosters in an attempt to gain a competitive advantage without an agreement or acknowledgement by both players pregame it will result in a forfeit. If you customize the standard online rosters in any way without informing your opponent pregame it can result in an unfavorable decision.

Guests are not allowed in 1v1 matches. If you play with a guest and do not inform your opponent prior to game play it can result in an unfavorable decision.

Some games lag and that it is not ideal for game play. Unless the game is exited immediately or at a point that we deem there to be little to no advantage for either party and evidence is provided of the claimed lag the game will have to be played out. We have no grounds to take a lead or win off the board when both players are playing at the same disadvantage. If someone is found to be intentionally lagging it will result in an automatic loss.

For any point spread to be valid it needs to be discussed and/or acknowledged by both parties prior to initiating the challenge or in the person giving the points rules. If we can not verify the point spread was acknowledged by the person giving the points prior to the challenge being initiated, and the opposing player covers, the match will be deemed a wash. All agreed upon point spreads will be added on to the final score upon completion of regulation unless the rules state otherwise. If a match is exited intentionally and a dispute is initiated the points are added on at that time.`
    },
    {
      title: "Disputes",
      content: `Disputes are filed under my matches on the my saloon page. Any time a rule is claimed to have been violated evidence is required to back that claim or it will be considered invalid.

Any rule claimed to be broken that can be viewed when the game starts, for example, amount of time per quarter or period, skill level, rosters, teams, jersey color, weather, game title, map, can be considered invalid based on amount of time played and/or score. Any claimed broken rule based on settings or functions that can be viewed pregame in a match played more than 25% through will be automatically invalid regardless of score. If you wait until your opponent has an advantage to exit and make a claim regarding a pregame setting, your claim will be considered invalid. If you do not agree with a pregame setting or the team being used, do not start the game.

There are no forfeit wins on NoctaZone in 1v1 matches nor is there any reason to claim a win in a game that has not begun.

If you intentionally exit a match while losing or the game is tied and provide no valid evidence that would give you grounds to exit the match you will concede the remaining time.

If you claim a win in a game you are losing or lost and provide nothing that would give you grounds to do so it will result in an automatic forfeit.

Claiming a win while in game and the outcome still in the balance can result in an unfavorable decision. If the game is played to a point where we deem the game to be in hand the score is what will be enforced. If your opponent claims a win while in game and you continue to play past that point, your claim will automatically be considered invalid.

Providing inaccurate information to your opponent in an attempt to mislead them or gain a competitive advantage you would not have otherwise had will result in an unfavorable decision.

Providing inaccurate information and/or evidence in an attempt to mislead NoctaZone staff in a review will result in an automatic forfeit.`
    },
    {
      title: "Absolutely No Cheating",
      content: `If a player proves a rule to be broken by their opponent at a point where they are winning the match, the match is tied, or within one score and the match is exited immediately, the player who broke the rule will concede the remaining time and lose the match.

If the match is played past the point the rule was violated or to a point the game is in hand and the evidence is sent in the match will be considered a draw and all money will be returned to the participants less the NoctaZone.com fee unless the evidence provided shows the broken rule had a direct effect on the final score.

For multiplayer tournaments a violation of an in game rule will result in a forfeit.

All decisions rendered by the NoctaZone.com staff are binding.`
    }
  ];

  return (
    <MainLayout>
      <div className="help-page">
        {/* Tabs */}
        <div className="help-tabs flex-nowrap">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`help-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {activeTab === tab.id && <div className="tab-arrow" />}
            </div>
          ))}
        </div>

        <Container className="py-4" style={{marginTop:'-80px'}}>
          {/* FAQs */}
          {/* FAQs */}
{activeTab === "faqs" && (
  <div className="privacy-policy-container text-center"  >
    <div className="privacy-policy-header">
      <LifeBuoy size={40} className="privacy-icon" />
      <h1>Frequently Asked Questions</h1>
      <p className="sub-heading">Quick answers to common questions</p>
    </div>

    <div className="privacy-policy-content text-start">
      {faqs.map((section, idx) => (
        <div key={idx} className="mb-4">
          <h4 style={{ color: "#00ffcc", marginBottom: "1rem" }}>{section.category}</h4>
          <Accordion>
            {section.items.map((item, i) => (
              <Accordion.Item eventKey={`${idx}-${i}`} key={i}>
                <Accordion.Header>{item.q}</Accordion.Header>
                <Accordion.Body>{item.a}</Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  </div>
)}

{/* Site Rules */}
{activeTab === "siterules" && (
  <div className="privacy-policy-container text-center">
    <div className="privacy-policy-header">
      <Scale size={40} className="privacy-icon" />
      <h1>Site Rules</h1>
      <p className="sub-heading">Fair play for everyone</p>
    </div>

    <div className="privacy-policy-content text-start">
      {siteRules.map((rule, index) => (
        <div key={index} style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontWeight: "bold", fontSize: "1.25rem", marginBottom: "0.5rem", color: "#00ffcc" }}>
            {rule.title}
          </h3>
          <p style={{ lineHeight: "1.6", whiteSpace: "pre-line" }}>
            {rule.content}
          </p>
        </div>
      ))}
    </div>
  </div>
)}


          {/* Support */}
          {activeTab === "support" && (
            <div className="privacy-policy-container text-center">
              <div className="privacy-policy-header">
                <LifeBuoy size={40} className="privacy-icon" />
                <h1>Support</h1>
                <p className="sub-heading">We're here to help</p>
              </div>

              <div className="privacy-policy-content text-center">
                <img
                  src="https://res.cloudinary.com/dm7edtofj/image/upload/v1754505778/logo_suleug.svg"
                  alt="NoctaZone Logo"
                  style={{ width: "100px", height: "auto", marginBottom: "20px", filter: "invert(1)" }}
                />
                <h2>NoctaZone</h2>
                <p className="mt-3 lead">
                  If you have any issues or questions, please email: <br />
                  <a href="mailto:customercare@noctazone.com">noctazone.customercare@gmail.com</a>
                </p>
              </div>
            </div>
          )}

          {/* Disputes */}
          {activeTab === "disputes" && (
            <div className="privacy-policy-container text-center">
              <div className="privacy-policy-header">
                <Scale size={40} className="privacy-icon" />
                <h1>Dispute Resolution</h1>
                <p className="sub-heading">Fair play, fair outcomes</p>
              </div>

              <div className="privacy-policy-content text-start">
                <h4 style={{ color: "#00ffcc" }}>Our Process</h4>
                <p>
                  At NoctaZone, disputes are handled with impartiality and respect for all players. 
                  Once you file a dispute, our team reviews all submitted evidence including screenshots 
                   and chat logs.
                </p>

                <h4 style={{ color: "#00ffcc" }}>Steps We Follow</h4>
                <ol>
                  <li>Verify that the dispute was filed within the allowed time frame.</li>
                  <li>Review all provided evidence from both parties.</li>
                  <li>Request additional details if necessary.</li>
                  <li>Make a ruling based on rules, fairness, and evidence quality.</li>
                </ol>

                <h4 style={{ color: "#00ffcc" }}>Important Notes</h4>
                <ul>
                  <li>Incomplete evidence may result in an automatic dismissal of the dispute.</li>
                  <li>False claims or manipulated evidence will lead to penalties.</li>
                  <li>Our decision is final and binding.</li>
                </ul>
              </div>
            </div>
          )}
        </Container>
      </div>
    </MainLayout>
  );
};

export default Help;
