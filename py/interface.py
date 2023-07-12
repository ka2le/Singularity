import tkinter as tk
from tkinter import scrolledtext
from main import main, trainAndTest
from useModel import useModel
from useAgent import useAgent
import sys
import os
import shutil
import psutil
p = psutil.Process()
p.nice(psutil.HIGH_PRIORITY_CLASS)



# Create main window
root = tk.Tk()
frame = tk.Frame(root)
frame.pack()

agent_dict = {"agent": None}
class FunctionRow:
    def __init__(self, frame, row, text, command, default_value=""):
        self.button = tk.Button(frame, text=text, command=command)
        self.button.grid(row=row, column=0)
        self.entry = tk.Entry(frame)
        if default_value != "":
            self.entry.insert(0, default_value)  # Set the default value
        self.entry.grid(row=row, column=1)

# Functions
def callTrainAndTest():
    num_train = int(mainRow.entry.get())  # Get the value from the entry field
    num_test = int(mainRow3.entry.get())  # Get the value from the entry field
    trainAndTest(num_train,num_test)


def callMain(row, mode = ""):
    input_value = int(mainRow.entry.get())  # Get the value from the entry field
    print(input_value)
    agent_dict["agent"] = main(input_value, mode)    
    
def remove_checkpoints(policy_dir = "policy"):
    if os.path.exists(policy_dir) and os.path.isdir(policy_dir):
        shutil.rmtree(policy_dir)
    if os.path.exists("my_saved_agent") and os.path.isdir("my_saved_agent"):
        shutil.rmtree("my_saved_agent")
def callUseAgent():
    agent = agent_dict["agent"]
    print(f"Type of agent before useAgent(): {type(agent)}")
    useAgent(agent)      

# Create rows
mainRow = FunctionRow(frame, 1, "Train ", lambda: callMain(mainRow), default_value="100")
mainRow2 = FunctionRow(frame, 2, "Train and Print", lambda: callMain(mainRow2, "human"))
#mainRow3 = FunctionRow(frame, 3, "Use Model", lambda: useModel())
mainRow3 = FunctionRow(frame, 3, "Train and Test", lambda: callTrainAndTest(), default_value="100")
mainRow4 = FunctionRow(frame, 4, "Reset", lambda: remove_checkpoints())







# Create a scrolled text field to capture stdout
st = scrolledtext.ScrolledText(root, state='disabled', width=190, height=100)
st.pack()
class IORedirector(object):
    def __init__(self, text_area):
        self.text_widget = text_area
    def write(self, str):
        self.text_widget.configure(state='normal')
        self.text_widget.insert("end", str)
        self.text_widget.see("end")
        self.text_widget.configure(state='disabled')
        self.text_widget.update_idletasks()  # Manually flush the Text widget
sys.stdout = IORedirector(st)

root.mainloop()
