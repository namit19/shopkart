import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginCustomer } from "../services/api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Enter a valid email address.";
    if (!form.password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await loginCustomer(form);
      navigate("/home", { replace: true });
    } catch (error) {
      setMessage(error.status === 401 ? "Invalid Credentials" : error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <Link className="brand auth-brand" to="/login"><span className="brand-mark">S</span> ShopKart</Link>
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Log in to ShopKart</h1>
        <p className="form-intro">Your good finds are just around the corner.</p>

        {location.state?.message && <p className="form-success" role="status">{location.state.message}</p>}
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} aria-invalid={Boolean(errors.email)} />
          {errors.email && <p className="field-error">{errors.email}</p>}

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={handleChange} aria-invalid={Boolean(errors.password)} />
          {errors.password && <p className="field-error">{errors.password}</p>}

          {message && <p className="form-error" role="alert">{message}</p>}
          <button className="button button-primary form-submit" type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="form-footer">New to ShopKart? <Link to="/register">Create an account</Link></p>
      </section>
      <aside className="auth-aside" aria-label="ShopKart message">
        <div className="aside-content">
          <span className="aside-label">GOOD FINDS. GREAT DAYS.</span>
          <p>Pick up where your next favorite begins.</p>
          <span className="aside-line" />
        </div>
      </aside>
    </main>
  );
}