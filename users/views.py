from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from .forms import UserRegisterForm, UserUpdateForm, ProfileUpdateForm
from django.contrib.auth import authenticate, login
from django.contrib.auth import logout 
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from blog.models import Post
from django.http import HttpResponseRedirect
from django.urls import reverse_lazy, reverse

def logout_view(request):
    logout(request)
    return render(request, 'users/logout.html')

def register(request):
    if request.method == 'POST':
        form = UserRegisterForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            messages.success(request, f'Account created for {username} successfully! You can now log in.')
            return redirect('login')
        else:
            # Show form errors
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field.title()}: {error}")
    else:
        form = UserRegisterForm()
    return render(request, 'users/register.html', {'form': form})
@login_required
def profile(request):
    if request.method == 'POST':
        user_form = UserUpdateForm(request.POST, instance=request.user)
        profile_form = ProfileUpdateForm(request.POST, 
                                       request.FILES, 
                                       instance=request.user.profile)
        
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Your profile has been updated!')
            return redirect('profile')
    else:
        user_form = UserUpdateForm(instance=request.user)
        profile_form = ProfileUpdateForm(instance=request.user.profile)

    context = {
        'user_form': user_form,
        'profile_form': profile_form
    }

    return render(request, 'users/profile.html', context)
@login_required
def LikeView(request, pk):
    post = get_object_or_404(Post, id=pk)
    
    # If user already liked, remove the like
    if request.user in post.likes.all():
        post.likes.remove(request.user)
    else:
        # Remove dislike if user has already disliked
        post.dislikes.remove(request.user)
        post.likes.add(request.user)

    return redirect(reverse('blog-home'))


@login_required
def DislikeView(request, pk):
    post = get_object_or_404(Post, id=pk)
    
    # If user already disliked, remove the dislike
    if request.user in post.dislikes.all():
        post.dislikes.remove(request.user)
    else:
        # Remove like if user has already liked
        post.likes.remove(request.user)
        post.dislikes.add(request.user)

    return redirect(reverse('blog-home'))