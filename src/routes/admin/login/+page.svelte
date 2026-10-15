<script lang="ts">
  import { enhance } from '$app/forms';

  export let form;
  let loading = false;
</script>

<svelte:head>
  <title>Admin Login — Museum of Twitter</title>
</svelte:head>

<div class="login-page">
  <div class="login-card">
    <h1 class="login-title">Museum of Twitter</h1>
    <p class="login-subtitle">Admin login</p>

    <form
      method="POST"
      use:enhance={() => {
        loading = true;
        return ({ update }) => {
          loading = false;
          update();
        };
      }}
      class="login-form"
    >
      {#if form?.error}
        <div class="login-error" role="alert">{form.error}</div>
      {/if}

      <div class="field">
        <label for="email" class="field-label">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autocomplete="email"
          required
          disabled={loading}
          class="field-input"
        />
      </div>

      <div class="field">
        <label for="password" class="field-label">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          disabled={loading}
          class="field-input"
        />
      </div>

      <button type="submit" disabled={loading} class="login-btn">
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-primary, rgb(0, 0, 0));
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 24px;
  }

  .login-card {
    width: 100%;
    max-width: 360px;
    background-color: var(--bg-secondary, rgb(22, 24, 28));
    border: 1px solid var(--border-color, rgb(47, 51, 54));
    border-radius: 16px;
    padding: 40px 32px;
  }

  .login-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary, rgb(231, 233, 234));
    margin: 0 0 4px;
    text-align: center;
  }

  .login-subtitle {
    font-size: 14px;
    color: var(--text-secondary, rgb(113, 118, 123));
    text-align: center;
    margin: 0 0 32px;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .login-error {
    background-color: rgba(244, 33, 46, 0.1);
    border: 1px solid rgba(244, 33, 46, 0.3);
    border-radius: 8px;
    color: rgb(244, 33, 46);
    font-size: 14px;
    padding: 10px 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, rgb(231, 233, 234));
  }

  .field-input {
    background-color: transparent;
    border: 1px solid var(--border-color, rgb(47, 51, 54));
    border-radius: 8px;
    color: var(--text-primary, rgb(231, 233, 234));
    font-family: inherit;
    font-size: 15px;
    padding: 10px 14px;
    transition: border-color 0.2s ease;
    width: 100%;
    box-sizing: border-box;
  }

  .field-input:focus {
    outline: none;
    border-color: rgb(29, 155, 240);
  }

  .field-input:disabled {
    opacity: 0.5;
  }

  .login-btn {
    background-color: rgb(231, 233, 234);
    border: none;
    border-radius: 9999px;
    color: rgb(0, 0, 0);
    cursor: pointer;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    padding: 12px;
    transition: opacity 0.2s ease;
    width: 100%;
    margin-top: 4px;
  }

  .login-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .login-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
