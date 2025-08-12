import React, { useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import SideNavbar from "../Components/SideNavbar";

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      {/* Fixed Top Navbar */}
      <TopNavbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ display: "flex" }}>
        {/* Sidebar (starts below top navbar) */}
        <SideNavbar isOpen={sidebarOpen} />

        {/* Main Content Area */}
        <main
  style={{
    marginTop: "65px", // height of TopNavbar 
    padding: "20px",
    width: "100%",
    transition: "margin-left 0.3s ease",
  }}
  className="mainlayout text-light bg-dark"
>
  {children}
</main>

      </div>
    </div>
  );
};

export default MainLayout;
