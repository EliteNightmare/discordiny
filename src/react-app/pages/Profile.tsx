import "./Profile.css";
import background from "../assets/background.jpg";
import TopBar from "../components/TopBar";

export default function Profile() {
  return (
    <>
      <TopBar />

      <main
        className="profile-page"
        style={{
          backgroundImage: `url(${background})`,
        }}
      />
    </>
  );
}
