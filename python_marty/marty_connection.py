'''
A script to connect to Marty the Robot via WiFi and make it walk
https://codemarty.com/
'''

# Import the Marty class from martypy library
from martypy import Marty

# Replace this with your Marty's IP address
MARTY_IP = "10.65.216.77"  # Change this to your Marty's actual IP address

def main():
    print(f"Connecting to Marty at {MARTY_IP}...")
    
    try:
        # Connect to Marty via WiFi
        # blocking=True means the program will wait for each movement to complete
        my_marty = Marty("wifi", MARTY_IP, blocking=True)
        
        print("Connected successfully!")
        
        # Get Marty ready
        print("Getting Marty ready...")
        my_marty.get_ready()
        
        # Make Marty sidestep left
        print("Sidestepping left...")
        # my_marty.walk(num_steps=5, step_length=40, move_time=1500)
        my_marty.sidestep(side="left", steps=5, step_length=40, move_time=1500)
        
        # Optional: Make Marty celebrate after walking
        print("Celebrating!")
        my_marty.celebrate()
        
        # Disconnect from Marty
        print("Disconnecting...")
        my_marty.close()
        print("Done!")
        
    except Exception as e:
        print(f"Error: {e}")
        print("\nMake sure:")
        print("1. Marty is powered on")
        print("2. You're connected to the same WiFi network as Marty")
        print("3. The IP address is correct")
        print("4. The bluetooth is turned off on the web app")

if __name__ == "__main__":
    main()
