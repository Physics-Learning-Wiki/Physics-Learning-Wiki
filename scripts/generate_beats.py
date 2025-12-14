import numpy as np
import matplotlib.pyplot as plt

def generate_beats(f1, f2, duration, sampling_rate):
    """
    Generate and plot the beats phenomenon for two close frequencies.

    Parameters:
        f1 (float): Frequency of the first wave (Hz).
        f2 (float): Frequency of the second wave (Hz).
        duration (float): Duration of the signal (seconds).
        sampling_rate (int): Sampling rate (samples per second).
    """
    t = np.linspace(0, duration, int(sampling_rate * duration), endpoint=False)

    # Generate the two waves
    wave1 = np.cos(2 * np.pi * f1 * t)
    wave2 = np.cos(2 * np.pi * f2 * t)

    # Superpose the waves
    superposed_wave = wave1 + wave2

    # Plot the waves
    plt.figure(figsize=(10, 6))

    # Plot wave1
    plt.subplot(3, 1, 1)
    plt.plot(t, wave1, label=f"Wave 1: {f1} Hz")
    plt.title("Wave 1")
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude")
    plt.legend()

    # Plot wave2
    plt.subplot(3, 1, 2)
    plt.plot(t, wave2, label=f"Wave 2: {f2} Hz", color="orange")
    plt.title("Wave 2")
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude")
    plt.legend()

    # Plot the superposed wave
    plt.subplot(3, 1, 3)
    plt.plot(t, superposed_wave, label="Superposed Wave", color="green")
    plt.title("Superposed Wave (Beats)")
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude")
    plt.legend()

    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    # Example parameters
    f1 = 440  # Frequency of the first wave (Hz)
    f2 = 442  # Frequency of the second wave (Hz)
    duration = 2  # Duration of the signal (seconds)
    sampling_rate = 10000  # Sampling rate (samples per second)

    generate_beats(f1, f2, duration, sampling_rate)