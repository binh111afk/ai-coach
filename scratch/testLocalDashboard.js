async function checkDashboard() {
  try {
    const res = await fetch("http://localhost:20128/dashboard/providers");
    console.log("Local 9Router Dashboard Status:", res.status);
  } catch (e) {
    console.log("Local 9Router Dashboard Error:", e.message);
  }
}

checkDashboard();
