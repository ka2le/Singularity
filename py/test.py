import pyglet

# Create a window
window = pyglet.window.Window()

# Register an event handler for the draw event
@window.event
def on_draw():
    # Clear the window
    window.clear()
    
    # Draw "Hello, World!" in the center of the window
    label = pyglet.text.Label(
        "Hello, World!",
        font_name="Arial",
        font_size=36,
        x=window.width // 2,
        y=window.height // 2,
        anchor_x="center",
        anchor_y="center"
    )
    label.draw()

# Start the application
pyglet.app.run()
