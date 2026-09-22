import "./TopBar.css";

import logo from "../assets/discordinylogo.png";
import discordIcon from "../assets/discord_icon.png";

export default function TopBar() {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button className="logo-button" type="button">
          <img
            src={logo}
            alt="Discordiny"
            className="discordiny-logo"
          />
        </button>

        <nav className="main-navigation">
          <button type="button">Profile</button>
          <button type="button">Inventories</button>
          <button type="button">Activities</button>
          <button type="button">Triumphs</button>
          <button type="button">Events</button>
        </nav>
      </div>

      <button className="account-button" type="button">
        <img
          src={discordIcon}
          alt="Discord account"
        />
        <span>Account</span>
      </button>
    </header>
  );
}
