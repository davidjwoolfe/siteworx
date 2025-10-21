"""
Simple Decision Tree Examples

This file contains two implementations:
1. A simple from-scratch decision tree for understanding the concept
2. A practical example using scikit-learn
"""

# Example 1: Simple Decision Tree from Scratch
# This implements a basic decision tree for classification

class SimpleDecisionNode:
    """A node in the decision tree"""
    def __init__(self, feature=None, threshold=None, left=None, right=None, value=None):
        self.feature = feature      # Index of feature to split on
        self.threshold = threshold  # Threshold value for split
        self.left = left           # Left child node
        self.right = right         # Right child node
        self.value = value         # Class value if leaf node

    def is_leaf(self):
        return self.value is not None


class SimpleDecisionTree:
    """A simple decision tree classifier"""

    def __init__(self, max_depth=3):
        self.max_depth = max_depth
        self.root = None

    def fit(self, X, y):
        """Build the decision tree"""
        self.root = self._build_tree(X, y, depth=0)

    def _build_tree(self, X, y, depth):
        """Recursively build the tree"""
        n_samples = len(y)
        n_classes = len(set(y))

        # Stopping criteria
        if depth >= self.max_depth or n_classes == 1 or n_samples < 2:
            leaf_value = self._most_common_label(y)
            return SimpleDecisionNode(value=leaf_value)

        # Find best split
        best_feature, best_threshold = self._find_best_split(X, y)

        if best_feature is None:
            leaf_value = self._most_common_label(y)
            return SimpleDecisionNode(value=leaf_value)

        # Split the data
        left_indices = [i for i in range(len(X)) if X[i][best_feature] <= best_threshold]
        right_indices = [i for i in range(len(X)) if X[i][best_feature] > best_threshold]

        # Recursively build left and right subtrees
        left = self._build_tree([X[i] for i in left_indices], [y[i] for i in left_indices], depth + 1)
        right = self._build_tree([X[i] for i in right_indices], [y[i] for i in right_indices], depth + 1)

        return SimpleDecisionNode(feature=best_feature, threshold=best_threshold, left=left, right=right)

    def _find_best_split(self, X, y):
        """Find the best feature and threshold to split on"""
        best_gain = -1
        best_feature = None
        best_threshold = None

        n_features = len(X[0])

        for feature in range(n_features):
            # Get unique values for this feature
            values = sorted(set([x[feature] for x in X]))

            # Try each midpoint as a threshold
            for i in range(len(values) - 1):
                threshold = (values[i] + values[i + 1]) / 2

                # Calculate information gain
                gain = self._information_gain(X, y, feature, threshold)

                if gain > best_gain:
                    best_gain = gain
                    best_feature = feature
                    best_threshold = threshold

        return best_feature, best_threshold

    def _information_gain(self, X, y, feature, threshold):
        """Calculate information gain for a split"""
        # Split indices
        left_indices = [i for i in range(len(X)) if X[i][feature] <= threshold]
        right_indices = [i for i in range(len(X)) if X[i][feature] > threshold]

        if len(left_indices) == 0 or len(right_indices) == 0:
            return 0

        # Parent entropy
        parent_entropy = self._entropy(y)

        # Weighted child entropy
        n = len(y)
        n_left, n_right = len(left_indices), len(right_indices)
        left_y = [y[i] for i in left_indices]
        right_y = [y[i] for i in right_indices]

        child_entropy = (n_left / n) * self._entropy(left_y) + (n_right / n) * self._entropy(right_y)

        return parent_entropy - child_entropy

    def _entropy(self, y):
        """Calculate entropy"""
        from collections import Counter
        import math

        counter = Counter(y)
        n = len(y)
        entropy = 0

        for count in counter.values():
            prob = count / n
            if prob > 0:
                entropy -= prob * math.log2(prob)

        return entropy

    def _most_common_label(self, y):
        """Return the most common label"""
        from collections import Counter
        counter = Counter(y)
        return counter.most_common(1)[0][0]

    def predict(self, X):
        """Predict classes for samples in X"""
        return [self._traverse_tree(x, self.root) for x in X]

    def _traverse_tree(self, x, node):
        """Traverse the tree to make a prediction"""
        if node.is_leaf():
            return node.value

        if x[node.feature] <= node.threshold:
            return self._traverse_tree(x, node.left)
        else:
            return self._traverse_tree(x, node.right)


# Example usage of SimpleDecisionTree
def example_1_from_scratch():
    print("=" * 60)
    print("Example 1: Simple Decision Tree from Scratch")
    print("=" * 60)

    # Simple dataset: [height, weight] -> [0=not athlete, 1=athlete]
    X_train = [
        [180, 75],  # Tall, heavy -> athlete
        [165, 55],  # Medium, light -> not athlete
        [175, 70],  # Tall, medium -> athlete
        [160, 50],  # Short, light -> not athlete
        [185, 80],  # Tall, heavy -> athlete
        [170, 65],  # Medium, medium -> not athlete
        [190, 85],  # Very tall, heavy -> athlete
        [155, 48],  # Short, light -> not athlete
    ]

    y_train = [1, 0, 1, 0, 1, 0, 1, 0]

    # Train the tree
    tree = SimpleDecisionTree(max_depth=3)
    tree.fit(X_train, y_train)

    # Make predictions
    X_test = [
        [182, 77],  # Should predict athlete (1)
        [162, 52],  # Should predict not athlete (0)
        [178, 72],  # Should predict athlete (1)
    ]

    predictions = tree.predict(X_test)

    print("\nTest samples:")
    for i, (x, pred) in enumerate(zip(X_test, predictions)):
        label = "athlete" if pred == 1 else "not athlete"
        print(f"  Sample {i+1}: height={x[0]}cm, weight={x[1]}kg -> {label}")

    print()


# Example 2: Using scikit-learn (More Practical)
def example_2_sklearn():
    print("=" * 60)
    print("Example 2: Decision Tree with scikit-learn")
    print("=" * 60)

    try:
        from sklearn.tree import DecisionTreeClassifier
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score, classification_report
        from sklearn.datasets import load_iris

        # Load the classic Iris dataset
        iris = load_iris()
        X, y = iris.data, iris.target

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.3, random_state=42
        )

        # Create and train the decision tree
        clf = DecisionTreeClassifier(
            max_depth=3,           # Maximum depth of the tree
            min_samples_split=2,   # Minimum samples required to split
            min_samples_leaf=1,    # Minimum samples required at leaf node
            random_state=42
        )

        clf.fit(X_train, y_train)

        # Make predictions
        y_pred = clf.predict(X_test)

        # Evaluate
        accuracy = accuracy_score(y_test, y_pred)
        print(f"\nAccuracy: {accuracy:.2f}")

        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=iris.target_names))

        # Show feature importance
        print("\nFeature Importance:")
        for i, importance in enumerate(clf.feature_importances_):
            print(f"  {iris.feature_names[i]}: {importance:.3f}")

        # Example prediction
        print("\nExample Prediction:")
        sample = [[5.1, 3.5, 1.4, 0.2]]  # Example flower measurements
        prediction = clf.predict(sample)
        print(f"  Input: {sample[0]}")
        print(f"  Predicted class: {iris.target_names[prediction[0]]}")

        # Optionally visualize the tree
        print("\n" + "=" * 60)
        print("To visualize the tree, install graphviz and uncomment below:")
        print("=" * 60)
        """
        from sklearn.tree import export_graphviz
        import graphviz

        dot_data = export_graphviz(
            clf,
            out_file=None,
            feature_names=iris.feature_names,
            class_names=iris.target_names,
            filled=True,
            rounded=True
        )
        graph = graphviz.Source(dot_data)
        graph.render("iris_decision_tree")  # Saves as PDF
        """

    except ImportError:
        print("\nNote: scikit-learn is not installed.")
        print("Install it with: pip install scikit-learn")


# Example 3: Simple Rule-Based Decision Tree (Most Basic)
def example_3_rule_based():
    print("=" * 60)
    print("Example 3: Rule-Based Decision Tree (Conceptual)")
    print("=" * 60)

    def classify_weather(temperature, humidity, wind):
        """
        Simple decision tree for deciding whether to play tennis

        Temperature: 'hot', 'mild', 'cool'
        Humidity: 'high', 'normal'
        Wind: 'strong', 'weak'
        """

        if temperature == 'hot':
            if humidity == 'high':
                return 'No'  # Don't play
            else:
                return 'Yes'  # Play
        elif temperature == 'mild':
            return 'Yes'  # Always play in mild weather
        else:  # cool
            if wind == 'strong':
                return 'No'  # Don't play
            else:
                return 'Yes'  # Play

    # Test cases
    test_cases = [
        ('hot', 'high', 'weak', 'No'),
        ('hot', 'normal', 'weak', 'Yes'),
        ('mild', 'high', 'strong', 'Yes'),
        ('cool', 'normal', 'weak', 'Yes'),
        ('cool', 'normal', 'strong', 'No'),
    ]

    print("\nDecision Tree Rules:")
    print("  If temp = hot:")
    print("    If humidity = high -> Don't Play")
    print("    If humidity = normal -> Play")
    print("  If temp = mild:")
    print("    -> Play")
    print("  If temp = cool:")
    print("    If wind = strong -> Don't Play")
    print("    If wind = weak -> Play")

    print("\nTest Cases:")
    for temp, humid, wind, expected in test_cases:
        result = classify_weather(temp, humid, wind)
        status = "✓" if result == expected else "✗"
        print(f"  {status} temp={temp}, humidity={humid}, wind={wind} -> {result}")

    print()


if __name__ == "__main__":
    # Run all examples
    example_1_from_scratch()
    example_2_sklearn()
    example_3_rule_based()

    print("\n" + "=" * 60)
    print("Summary:")
    print("=" * 60)
    print("1. From-scratch: Shows how decision trees work internally")
    print("2. Scikit-learn: Production-ready implementation")
    print("3. Rule-based: Conceptual understanding of decision logic")
    print("=" * 60)
