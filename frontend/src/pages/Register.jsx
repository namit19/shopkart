import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerCustomer } from "../services/api";

const initialForm = { fullName: "", email: "", password: "", phone: "" };

function validate(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address.";
  if (form.password.length < 6) errors.password = "Use at least 6 characters.";
  if (!form.phone.trim()) errors.phone = "Enter your phone number.";
  return errors;
}

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await registerCustomer(form);
      navigate("/login", { replace: true, state: { message: "Account created. You can now log in." } });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <Link className="brand auth-brand" to="/login"><span className="brand-mark">S</span> ShopKart</Link>
        <p className="eyebrow">YOUR NEXT FAVORITE THING</p>
        <h1>Create your account</h1>
        <p className="form-intro">A few details and you’re ready to shop.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="fullName">Full name</label>
          <input id="fullName" name="fullName" autoComplete="name" value={form.fullName} onChange={handleChange} aria-invalid={Boolean(errors.fullName)} />
          {errors.fullName && <p className="field-error">{errors.fullName}</p>}

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} aria-invalid={Boolean(errors.email)} />
          {errors.email && <p className="field-error">{errors.email}</p>}

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={handleChange} aria-invalid={Boolean(errors.password)} />
          {errors.password && <p className="field-error">{errors.password}</p>}

          <label htmlFor="phone">Phone number</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={handleChange} aria-invalid={Boolean(errors.phone)} />
          {errors.phone && <p className="field-error">{errors.phone}</p>}

          {message && <p className="form-error" role="alert">{message}</p>}
          <button className="button button-primary form-submit" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="form-footer">Already have an account? <Link to="/login">Log in</Link></p>
      </section>
      <aside className="auth-aside" aria-label="ShopKart message">
        <div className="aside-content">
          <span className="aside-label">GOOD FINDS. GREAT DAYS.</span>
          <p>Make room for the things you’ll love.</p>
          <span className="aside-line" />
        </div>
      </aside>
    </main>
  );
}