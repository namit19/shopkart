import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getMyProfile } from "../services/api";

export default function Home() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let active = true;

    getMyProfile()
      .then((result) => {
        if (active) setCustomer(result.customer || result);
      })
      .catch(() => {
        if (active) setUnauthorized(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (unauthorized) return <Navigate to="/login" replace />;
  if (loading) return <main className="loading-screen" role="status">Checking your session...</main>;
  if (!customer) return <Navigate to="/login" replace />;

  return (
    <div className="home-page">
      <Navbar />
      <main className="home-content">
        <p className="eyebrow">YOUR SHOPKART ACCOUNT</p>
        <h1>Welcome, {customer.fullName?.split(" ")[0] || "Customer"}.</h1>
        <p className="form-intro">You’re signed in. Here are your account details.</p>
        <section className="profile" aria-labelledby="profile-title">
          <h2 id="profile-title">Customer details</h2>
          <dl>
            <div><dt>Full name</dt><dd>{customer.fullName}</dd></div>
            <div><dt>Email</dt><dd>{customer.email}</dd></div>
            <div><dt>Phone number</dt><dd>{customer.phone}</dd></div>
          </dl>
          <div style={{ marginTop: "24px" }}>
            <Link to="/products" className="button button-primary" style={{ display: "inline-block", padding: "10px 20px" }}>
              Explore Products Catalog →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}