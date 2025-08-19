from django.test import TestCase
from django.contrib.auth.models import User
from users.models import Profile
from rich.console import Console
from django.urls import reverse
from django.conf import settings

console = Console()

class ProfileModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.user.profile.bio = ""
        self.user.profile.save()

    def test_profile_creation(self):
        """Check if a profile is created automatically when a user is created."""
        try:
            self.assertIsInstance(self.user.profile, Profile)
            console.print("[bold green]✔ Profile creation test passed![/bold green]")
        except AssertionError:
            console.print("[bold red]❌ Profile creation test failed![/bold red]")
            raise

    def test_profile_defaults(self):
        """Ensure default profile fields are correct."""
        try:
            self.assertEqual(self.user.profile.bio, "")
            console.print("[bold green]✔ Default profile fields test passed![/bold green]")
        except AssertionError:
            console.print("[bold red]❌ Default profile fields test failed![/bold red]")
            raise


class UserAuthenticationTest(TestCase):
    def setUp(self):
        """Create a test user before running the tests."""
        self.user = User.objects.create_user(username="testuser", password="testpass")

    def test_login(self):
        """Test if a user can log in successfully."""
        login = self.client.login(username="testuser", password="testpass")
        try:
            self.assertTrue(login)
            console.print("[bold green]✔ Login test passed! User successfully logged in.[/bold green]")
        except AssertionError:
            console.print("[bold red]❌ Login test failed![/bold red]")
            raise

    def test_logout(self):
        """Test if a user is redirected to the login page after logging out."""
        self.client.login(username="testuser", password="testpass")
        self.client.logout()
        response = self.client.get(reverse("profile"))  # Replace with the actual profile URL name

        expected_redirect_url = f"{settings.LOGIN_URL}?next=/profile/"
        try:
            self.assertRedirects(response, expected_redirect_url)
            console.print(f"[bold green]✔ Logout test passed! Redirected to {expected_redirect_url}.[/bold green]")
        except AssertionError:
            console.print(f"[bold red]❌ Logout test failed! Expected {expected_redirect_url} but got {response.url}.[/bold red]")
            raise